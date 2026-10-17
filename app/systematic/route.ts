export async function GET(request: Request) { return Response.redirect(new URL('/systematic.html', request.url), 302); }
