export async function GET(request: Request) { return Response.redirect(new URL('/literature-teacher.html', request.url), 302); }
