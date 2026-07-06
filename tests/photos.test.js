const request = require("supertest");
const app = require("../src/app");

// Mock the database pool so tests don't need a real PostgreSQL connection
jest.mock("../src/db", () => ({
  query: jest.fn(),
}));

// Mock S3 so tests don't need real AWS credentials
jest.mock("../src/s3", () => ({
  uploadToS3: jest.fn(),
  deleteFromS3: jest.fn(),
}));

const pool = require("../src/db");
const { uploadToS3 } = require("../src/s3");

describe("GET /api/photos", () => {
  it("returns a list of photos with status 200", async () => {
    // Arrange: mock the DB to return two fake photos
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          s3_url: "https://bucket.s3.amazonaws.com/photos/abc",
          caption: "My first memory",
          uploaded_at: new Date().toISOString(),
          reaction_count: "3",
        },
        {
          id: 2,
          s3_url: "https://bucket.s3.amazonaws.com/photos/def",
          caption: "A good day",
          uploaded_at: new Date().toISOString(),
          reaction_count: "0",
        },
      ],
    });

    // Act
    const response = await request(app).get("/api/photos");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].caption).toBe("My first memory");
  });

  it("returns 500 if database query fails", async () => {
    pool.query.mockRejectedValueOnce(new Error("DB connection failed"));

    const response = await request(app).get("/api/photos");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to fetch photos");
  });
});

describe("POST /api/photos", () => {
  it("returns 401 if admin password is missing", async () => {
    const response = await request(app)
      .post("/api/photos")
      .field("caption", "Test caption");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("returns 400 if caption is missing", async () => {
    const response = await request(app)
      .post("/api/photos")
      .set("x-admin-password", "gallery123")
      .attach("photo", Buffer.from("fake image data"), {
        filename: "test.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Caption is required");
  });

  it("uploads photo and returns 201 on success", async () => {
    // Mock S3 upload returning a key and URL
    uploadToS3.mockResolvedValueOnce({
      key: "photos/test-uuid",
      url: "https://bucket.s3.amazonaws.com/photos/test-uuid",
    });

    // Mock DB insert returning the new row
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          s3_key: "photos/test-uuid",
          s3_url: "https://bucket.s3.amazonaws.com/photos/test-uuid",
          caption: "A beautiful sunset",
          uploaded_at: new Date().toISOString(),
        },
      ],
    });

    const response = await request(app)
      .post("/api/photos")
      .set("x-admin-password", "gallery123")
      .field("caption", "A beautiful sunset")
      .attach("photo", Buffer.from("fake image data"), {
        filename: "sunset.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(201);
    expect(response.body.caption).toBe("A beautiful sunset");
  });
});

describe("DELETE /api/photos/:id", () => {
  it("returns 401 if admin password is missing", async () => {
    const response = await request(app).delete("/api/photos/1");
    expect(response.status).toBe(401);
  });

  it("returns 404 if photo does not exist", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .delete("/api/photos/999")
      .set("x-admin-password", "gallery123");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Photo not found");
  });
});