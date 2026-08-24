import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string | null;

    if (!file || !path) {
      return NextResponse.json(
        { error: "Missing file or path" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.storage
      .from("product-media")
      .upload(path, buffer, {
        contentType: file.type || "image/jpeg",
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("[api/admin/upload] Supabase storage upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("product-media").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err: unknown) {
    console.error("[api/admin/upload] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
