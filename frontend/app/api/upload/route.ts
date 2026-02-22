import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads');
const DB_PATH = join(UPLOADS_DIR, 'sources.json');

// Ensure directory and db exist
async function initDb() {
    if (!existsSync(UPLOADS_DIR)) {
        await mkdir(UPLOADS_DIR, { recursive: true });
    }
    if (!existsSync(DB_PATH)) {
        await writeFile(DB_PATH, JSON.stringify([]), 'utf-8');
    }
}

export async function POST(req: NextRequest) {
    try {
        await initDb();
        const formData = await req.formData();

        const id = Date.now().toString();
        const sourceType = formData.get('sourceType') as string; // 'file', 'note', 'scan'
        const dataType = formData.get('dataType') as string; // '1', '2', '3'
        const title = formData.get('title') as string || `Source ${id}`;

        let filePath = '';
        let fileType = '';

        if (sourceType === 'note' || sourceType === 'scan') {
            const content = formData.get('content') as string;
            fileType = 'text/plain';
            filePath = `/uploads/${id}.txt`;
            await writeFile(join(UPLOADS_DIR, `${id}.txt`), content, 'utf-8');
        } else {
            const file = formData.get('file') as File;
            if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const ext = file.name.split('.').pop();
            fileType = file.type || 'application/octet-stream';
            filePath = `/uploads/${id}.${ext}`;
            await writeFile(join(UPLOADS_DIR, `${id}.${ext}`), buffer);
        }

        // Update DB
        const dbContent = await readFile(DB_PATH, 'utf-8');
        const sources = JSON.parse(dbContent);
        const newSource = {
            id,
            title,
            sourceType,
            dataType,
            fileType,
            url: filePath,
            createdAt: new Date().toISOString()
        };

        sources.push(newSource);
        await writeFile(DB_PATH, JSON.stringify(sources, null, 2), 'utf-8');

        return NextResponse.json(newSource);
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
