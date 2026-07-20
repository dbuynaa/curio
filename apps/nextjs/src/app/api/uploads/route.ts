import type { HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";

import { getSession } from "~/auth/server";
import { env } from "~/env";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const uploadPayloads = new Set(["collection-cover", "item-thumbnail"]);

export async function POST(request: Request) {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Image uploads are not configured" },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const response = await handleUpload({
      token: env.BLOB_READ_WRITE_TOKEN,
      request,
      body,
      onBeforeGenerateToken: (pathname, clientPayload) => {
        const purpose = clientPayload
          ? (JSON.parse(clientPayload) as { purpose?: string }).purpose
          : undefined;

        if (
          !purpose ||
          !uploadPayloads.has(purpose) ||
          !pathname.startsWith(`uploads/${purpose}/`)
        ) {
          throw new Error("Invalid upload request");
        }

        return Promise.resolve({
          allowedContentTypes: ALLOWED_IMAGE_TYPES,
          maximumSizeInBytes: MAX_IMAGE_SIZE,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ userId: session.user.id, purpose }),
        });
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Image upload token generation failed", error);
    return NextResponse.json(
      { error: "Unable to prepare image upload" },
      { status: 400 },
    );
  }
}
