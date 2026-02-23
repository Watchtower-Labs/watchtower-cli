import {NextResponse} from 'next/server';
import {readTrace} from '@/lib/trace-reader';

export async function GET(
  _request: Request,
  {params}: {params: Promise<{id: string}>}
) {
  try {
    const {id} = await params;

    // Validate ID format to prevent path traversal
    if (!/^[\w-]+$/.test(id)) {
      return NextResponse.json({error: 'Invalid trace ID'}, {status: 400});
    }

    const trace = readTrace(id);
    if (!trace) {
      return NextResponse.json({error: 'Trace not found'}, {status: 404});
    }
    return NextResponse.json({trace});
  } catch (error) {
    console.error('[API /traces/:id] Failed to read trace:', error);
    return NextResponse.json(
      {error: 'Failed to read trace'},
      {status: 500}
    );
  }
}
