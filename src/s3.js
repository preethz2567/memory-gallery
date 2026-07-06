const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { randomUUID } = require("crypto");
require("dotenv").config();

// Create one S3 client instance — reused across all operations
// In production on EC2, credentials come from the IAM role attached
// to the instance (no access key needed in env vars at all)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  // Credentials are optional here — on EC2 with an IAM role,
  // the SDK picks them up automatically from instance metadata
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  }),
});

const BUCKET = process.env.S3_BUCKET_NAME;

async function uploadToS3(fileBuffer, mimetype) {
  // Generate a unique key so two uploads of the same filename don't overwrite each other
  const key = `photos/${randomUUID()}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype,
    })
  );

  // Return both the key (for deletion later) and the public URL
  const url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return { key, url };
}

async function deleteFromS3(key) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

module.exports = { uploadToS3, deleteFromS3 };