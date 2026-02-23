import {type NextRequest, NextResponse} from 'next/server';
import {listTraces} from '@/lib/trace-reader';

export async function GET(request: NextRequest) {
  try {
    const {searchParams} = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200);
    const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);

    const allTraces = listTraces();
    const total = allTraces.length;
    const traces = allTraces.slice(offset, offset + limit);

    return NextResponse.json({traces, total, limit, offset});
  } catch (error) {
    console.error('[API /traces] Failed to list traces:', error);
    return NextResponse.json(
      {error: 'Failed to list traces'},
      {status: 500}
    );
  }
}
