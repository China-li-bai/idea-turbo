import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const WAITLIST_FILE = path.join(process.cwd(), 'data', 'waitlist.json');

interface WaitlistEntry {
  email: string;
  source: string;
  timestamp: number;
  locale: string;
}

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function getWaitlist(): Promise<WaitlistEntry[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(WAITLIST_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveWaitlist(entries: WaitlistEntry[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(WAITLIST_FILE, JSON.stringify(entries, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, source, timestamp, locale } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const waitlist = await getWaitlist();
    
    const existingEntry = waitlist.find(entry => entry.email === email);
    if (existingEntry) {
      return NextResponse.json(
        { error: 'Email already registered', alreadyRegistered: true },
        { status: 200 }
      );
    }

    const newEntry: WaitlistEntry = {
      email,
      source: source || 'unknown',
      timestamp: timestamp || Date.now(),
      locale: locale || 'en',
    };

    waitlist.push(newEntry);
    await saveWaitlist(waitlist);

    console.log(`[Waitlist] New signup: ${email} (total: ${waitlist.length})`);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Successfully added to waitlist',
        position: waitlist.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Waitlist] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const waitlist = await getWaitlist();
    
    return NextResponse.json({
      total: waitlist.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Waitlist] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
