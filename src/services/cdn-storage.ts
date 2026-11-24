import {
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { cdnStorageConfig } from "../config/constants";

export interface CdnStorage {
  read(key: string): Promise<string | null>;
  write(key: string, body: string, contentType: string): Promise<void>;
}

function createS3CdnStorage(): CdnStorage {
  const { endpoint, region, bucket, accessKeyId, secretAccessKey } =
    cdnStorageConfig;
  const client = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return {
    async read(key) {
      try {
        const { Body } = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        );
        return Body ? await Body.transformToString("utf-8") : null;
      } catch (err) {
        if (
          err instanceof NoSuchKey ||
          (err as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode === 404
        ) {
          return null;
        }
        throw err;
      }
    },
    async write(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
  };
}

let storage: CdnStorage | null | undefined;

export function getCdnStorage(): CdnStorage | null {
  if (storage === undefined) {
    const { endpoint, bucket, accessKeyId, secretAccessKey } = cdnStorageConfig;
    storage =
      endpoint && bucket && accessKeyId && secretAccessKey
        ? createS3CdnStorage()
        : null;
  }
  return storage;
}
