import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads');
const DB_PATH = join(UPLOADS_DIR, 'sources.json');

// Get all sources
export async function GET() {
    try {
        if (!existsSync(DB_PATH)) return NextResponse.json([]);
        const dbContent = await readFile(DB_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(dbContent));
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Update source content (for editing text/markdown)
export async function PUT(req: NextRequest) {
    try {
        const { id, content } = await req.json();
        if (!id || content === undefined) {
            return NextResponse.json({ error: 'Missing id or content' }, { status: 400 });
        }

        if (!existsSync(DB_PATH)) return NextResponse.json({ error: 'DB not found' }, { status: 404 });
        const dbContent = await readFile(DB_PATH, 'utf-8');
        const sources = JSON.parse(dbContent);

        const sourceIndex = sources.findIndex((s: any) => s.id === id);
        if (sourceIndex === -1) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

        const source = sources[sourceIndex];
        if (!source.url.endsWith('.txt') && !source.url.endsWith('.md')) {
            return NextResponse.json({ error: 'Cannot edit this file type' }, { status: 400 });
        }

        const fileName = source.url.split('/').pop();
        await writeFile(join(UPLOADS_DIR, fileName), content, 'utf-8');

        return NextResponse.json({ success: true, source });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
