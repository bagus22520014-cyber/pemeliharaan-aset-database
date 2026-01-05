import { expect } from "chai";
import request from "supertest";
import { execSync } from "child_process";
import dotenv from "dotenv";
dotenv.config();

const base = process.env.BASE_URL || "http://localhost:4000";

describe("Maintenance E2E flow", function () {
  this.timeout(20000);
  it("should run create -> generate -> notify -> claim -> complete", async () => {
    // create a minimal asset if needed via API (assumes asset id 1 exists in test DB)
    const ruleRes = await request(base)
      .post("/maintenance/rules")
      .set("x-username", "test")
      .set("x-role", "admin")
      .send({
        asset_id: 1,
        title: "E2E rule",
        interval_value: 1,
        interval_unit: "month",
        start_date: "2020-01-01",
      });
    expect([200, 201]).to.include(ruleRes.status);
    const rule = ruleRes.body;

    // run generator script
    execSync("node scripts/generateSchedules.js", { stdio: "inherit" });

    // fetch schedules
    const schedulesRes = await request(base)
      .get("/maintenance/schedules")
      .set("x-username", "test")
      .set("x-role", "admin");
    expect(schedulesRes.status).to.equal(200);
    const schedules = schedulesRes.body || [];
    expect(schedules.length).to.be.greaterThan(0);
    const schedule =
      schedules.find((s) => s.rule_id === rule.id) || schedules[0];

    // run notifications sender (will insert logs)
    execSync("node scripts/sendNotifications.js", { stdio: "inherit" });

    // claim
    const claimRes = await request(base)
      .post(`/maintenance/schedules/${schedule.id}/claim`)
      .set("x-username", "technician")
      .set("x-role", "user");
    expect([200, 201, 409]).to.include(claimRes.status);

    // complete
    const completeRes = await request(base)
      .post(`/maintenance/schedules/${schedule.id}/complete`)
      .set("x-username", "technician")
      .set("x-role", "user")
      .send({ performed_at: new Date().toISOString().slice(0, 10), cost: 0 });
    expect([200, 201]).to.include(completeRes.status);
  });
});
