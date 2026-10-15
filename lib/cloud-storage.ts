import fs from "fs";
import path from "path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const DATA_DIR = path.join(process.cwd(), "data");

function requiredEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not configured.`);
  return v;
}

/** True when Backblaze B2 (S3-compatible) credentials are set. */
export function isRemoteCloudStorageConfigured(): boolean {
  return !!(
    process.env.B2_APPLICATION_KEY_ID?.trim() &&
    process.env.B2_APPLICATION_KEY?.trim() &&
    process.env.B2_BUCKET_NAME?.trim() &&
    process.env.B2_ENDPOINT?.trim()
  );
}

function getBucket(): string {
  return requiredEnv("B2_BUCKET_NAME");
}

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: requiredEnv("B2_ENDPOINT"),
    region: process.env.B2_REGION?.trim() || "us-west-004",
    credentials: {
      accessKeyId: requiredEnv("B2_APPLICATION_KEY_ID"),
      secretAccessKey: requiredEnv("B2_APPLICATION_KEY"),
    },
    forcePathStyle: true,
  });
}

function localPathForKey(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._/-]/g, "_");
  return path.join(DATA_DIR, "cloud", safe);
}

/** Read a JSON manifest or file from B2, or local disk when B2 is not configured. */
export async function readCloudObject(key: string): Promise<Buffer | null> {
  if (isRemoteCloudStorageConfigured()) {
    try {
      const res = await getS3Client().send(
        new GetObjectCommand({ Bucket: getBucket(), Key: key }),
      );
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch (e) {
      const name = e && typeof e === "object" && "name" in e ? String(e.name) : "";
      if (name === "NoSuchKey" || name === "NotFound") return null;
      throw e;
    }
  }

  const filePath = localPathForKey(key);
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

export async function writeCloudObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if (isRemoteCloudStorageConfigured()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return;
  }

  const filePath = localPathForKey(key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, body);
}

export async function deleteCloudObject(key: string): Promise<void> {
  if (isRemoteCloudStorageConfigured()) {
    try {
      await getS3Client().send(
        new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
      );
    } catch {
      /* object may already be gone */
    }
    return;
  }

  try {
    fs.unlinkSync(localPathForKey(key));
  } catch {
    /* ignore */
  }
}

export async function readCloudJson<T>(key: string): Promise<T | null> {
  const buf = await readCloudObject(key);
  if (!buf) return null;
  try {
    return JSON.parse(buf.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function writeCloudJson(key: string, data: unknown): Promise<void> {
  await writeCloudObject(
    key,
    Buffer.from(JSON.stringify(data, null, 2), "utf8"),
    "application/json",
  );
}
