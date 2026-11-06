import {
  DeleteObjectCommand,
  ListObjectVersionsCommand,
  type S3Client,
} from '@aws-sdk/client-s3';

export async function eraseS3Object(
  client: S3Client,
  bucket: string,
  key: string,
) {
  // Suspended versioning still creates delete markers. Delete by version ID
  // (including "null") so a successful operation leaves no retained copies.
  const versions: string[] = [];
  let keyMarker: string | undefined;
  let versionMarker: string | undefined;
  for (;;) {
    const page = await client.send(
      new ListObjectVersionsCommand({
        Bucket: bucket,
        Prefix: key,
        KeyMarker: keyMarker,
        VersionIdMarker: versionMarker,
      }),
    );
    for (const entry of [
      ...(page.Versions ?? []),
      ...(page.DeleteMarkers ?? []),
    ]) {
      if (entry.Key !== key) continue;
      if (!entry.VersionId)
        throw new Error('Missing object version identifier');
      versions.push(entry.VersionId);
    }
    if (!page.IsTruncated) break;
    if (
      !page.NextKeyMarker ||
      (page.NextKeyMarker === keyMarker &&
        page.NextVersionIdMarker === versionMarker)
    ) {
      throw new Error('Invalid object version pagination');
    }
    keyMarker = page.NextKeyMarker;
    versionMarker = page.NextVersionIdMarker;
  }
  for (const VersionId of versions) {
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key, VersionId }),
    );
  }
  const remaining = await client.send(
    new ListObjectVersionsCommand({ Bucket: bucket, Prefix: key }),
  );
  if (
    [...(remaining.Versions ?? []), ...(remaining.DeleteMarkers ?? [])].some(
      (entry) => entry.Key === key,
    )
  ) {
    throw new Error('Document erasure incomplete');
  }
}
