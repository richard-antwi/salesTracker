import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    // Prevent directory traversal attacks
    const sanitizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jhxctmcjbjkicgrlzftr.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceRoleKey) {
      // Supabase Private Bucket Fetch
      const response = await fetch(`${supabaseUrl}/storage/v1/object/documents/${sanitizedPath}`, {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });

      if (!response.ok) {
        return NextResponse.json({ error: 'Document not found or access denied' }, { status: response.status });
      }

      const blob = await response.blob();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';

      return new Response(blob, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${path.basename(sanitizedPath)}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } else {
      // Local Disk Fallback
      const localFilePath = path.join(process.cwd(), 'public', 'uploads', path.basename(sanitizedPath));
      if (!fs.existsSync(localFilePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const fileBuffer = await fs.promises.readFile(localFilePath);
      return new Response(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `inline; filename="${path.basename(sanitizedPath)}"`,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching document download:', error);
    return NextResponse.json({ error: 'Failed to retrieve document' }, { status: 500 });
  }
}
