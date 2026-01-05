import { expect } from "chai";
import request from "supertest";
import app from "../../index.js";

// Integration tests require a test database and controlled environment.
// Enable by setting TEST_INTEGRATION=1 when running tests.

const runIntegration = process.env.TEST_INTEGRATION === "1";

describe("maintenance integration flow", function () {
  this.timeout(20000);
  if (!runIntegration) {
    it("skipped integration tests by default", () => {});
    return;
  }

  let createdRule = null;
  let generatedSchedule = null;

  it("creates a maintenance rule", async () => {
    const res = await request(app)
      .post("/maintenance/rules")
      .set("x-username", "admin")
      .set("x-role", "admin")
      .send({
        asset_id: 1,
        title: "Integration Test Rule",
        interval_value: 1,
        interval_unit: "month",
        start_date: "2025-12-01",
      });
    expect(res.status).to.equal(201);
    createdRule = res.body.rule;
    expect(createdRule).to.have.property("id");
  });

  it("generates schedules", async () => {
    // call script endpoint or run generator script via child_process if available
    const gen = await request(app).get("/debug/run-generate-schedules");
    expect(gen.status).to.be.oneOf([200, 204, 201, 302]);
  });

  it("finds generated schedule", async () => {
    const list = await request(app)
      .get("/maintenance/schedules")
      .set("x-username", "admin")
      .set("x-role", "admin")
      .query({ rule_id: createdRule.id });
    expect(list.status).to.equal(200);
    const schedules = list.body.schedules || [];
    expect(schedules.length).to.be.greaterThan(0);
    generatedSchedule = schedules[0];
  });

  it("concurrent claims only one wins", async () => {
    // send concurrent requests
    const promises = [];
    for (let i = 0; i < 6; i++) {
      promises.push(
        request(app)
          .post(`/maintenance/${generatedSchedule.id}/claim`)
          .set("x-username", "user" + i)
          .set("x-role", "user")
      );
    }
    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r.status === 200).length;
    const conflictCount = results.filter((r) => r.status === 409).length;
    expect(successCount).to.equal(1);
    expect(conflictCount).to.equal(5);
  });

  it("completes schedule idempotently", async () => {
    const res1 = await request(app)
      .post(`/maintenance/${generatedSchedule.id}/complete`)
      .set("x-username", "admin")
      .set("x-role", "admin")
      .send({ description: "done" });
    expect(res1.status).to.equal(200);
    const res2 = await request(app)
      .post(`/maintenance/${generatedSchedule.id}/complete`)
      .set("x-username", "admin")
      .set("x-role", "admin")
      .send({ description: "done" });
    // either 200 or idempotent success message
    expect([200, 409, 200]).to.include(res2.status);
  });
});
