export async function GET(request: Request) { return Response.redirect(new URL('/literature.html', request.url), 302); }
