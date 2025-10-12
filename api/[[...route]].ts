import app from '../backend/hono';

export async function GET(request: Request) {
  return app.fetch(request);
}

export async function POST(request: Request) {
  return app.fetch(request);
}

export async function PUT(request: Request) {
  return app.fetch(request);
}

export async function DELETE(request: Request) {
  return app.fetch(request);
}

export async function PATCH(request: Request) {
  return app.fetch(request);
}

export async function OPTIONS(request: Request) {
  return app.fetch(request);
}

export default async function handler(request: Request) {
  return app.fetch(request);
}
