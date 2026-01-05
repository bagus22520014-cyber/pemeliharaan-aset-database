import { expect } from "chai";
import request from "supertest";
import app from "../../index.js";
import db from "../../db.js";
import { execSync } from "child_process";

describe("E2E: create -> generate -> notify -> claim -> complete", function () {
  this.timeout(20000);

  let assetId = null;
  let ruleId = null;
  let scheduleId = null;

  before(async () => {
    // ensure test DB configured via env
    // create beban, user, asset
    const [r1] = await db
      .promise()
      .execute("INSERT INTO beban (nama, kode) VALUES (?, ?)", [
        "Test Beban",
        "TEST-B",
      ]);
    const bebanId = r1.insertId;
    const [ru] = await db
      .promise()
      .execute("INSERT INTO user (username, role) VALUES (?, ?)", [
        "test-admin",
        "admin",
      ]);
    const userId = ru.insertId;
    const [ra] = await db
      .promise()
      .execute("INSERT INTO assets (nama, beban_id) VALUES (?, ?)", [
        "Test Asset",
        bebanId,
      ]);
    assetId = ra.insertId;
  });

  after(async () => {
    // cleanup minimal created rows
    try {
      await db
        .promise()
        .execute("DELETE FROM maintenance_schedules WHERE meta LIKE ?", [
          "%generated_from%",
        ]);
      await db
        .promise()
        .execute("DELETE FROM maintenance_rules WHERE asset_id = ?", [assetId]);
    } catch (e) {}
  });

  it("creates a rule", async () => {
    const today = new Date().toISOString().split("T")[0];
    const res = await request(app)
      .post("/maintenance/rules")
      .set("x-role", "admin")
      .set("x-username", "test-admin")
      .send({
        asset_id: assetId,
        title: "E2E Rule",
        interval_value: 1,
        interval_unit: "day",
        start_date: today,
      })
      .expect(201);
    expect(res.body).to.have.property("rule");
    ruleId = res.body.rule.id;
  });

  it("runs generator and notification scripts", async () => {
    // run generateSchedules.js
    execSync("node scripts/generateSchedules.js", { stdio: "inherit" });
    // run sendNotifications.js
    execSync("node scripts/sendNotifications.js", { stdio: "inherit" });

    // find schedule
    const [srows] = await db
      .promise()
      .query("SELECT * FROM maintenance_schedules WHERE rule_id = ? LIMIT 1", [
        ruleId,
      ]);
    expect(srows.length).to.be.greaterThan(0);
    scheduleId = srows[0].id;

    // check notification_logs exists
    const [nrows] = await db
      .promise()
      .query("SELECT * FROM notification_logs WHERE schedule_id = ? LIMIT 1", [
        scheduleId,
      ]);
    expect(nrows.length).to.be.greaterThan(0);
  });

  it("claims and completes schedule", async () => {
    // claim
    await request(app)
      .post(`/maintenance/${scheduleId}/claim`)
      .set("x-role", "user")
      .set("x-username", "test-admin")
      .expect(200);

    // complete
    await request(app)
      .post(`/maintenance/${scheduleId}/complete`)
      .set("x-role", "user")
      .set("x-username", "test-admin")
      .send({ description: "Completed by e2e", cost: 0 })
      .expect(200);

    // verify schedule marked completed
    const [s] = await db
      .promise()
      .query("SELECT status FROM maintenance_schedules WHERE id = ?", [
        scheduleId,
      ]);
    expect(s[0].status).to.equal("completed");
  });
});
