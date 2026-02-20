function htmlError(message: string, status: number) {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error de Autenticación</title>
      <style>
        body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f4f4f9; }
        .card { padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
        h1 { color: #e53e3e; }
        p { color: #4a5568; }
        button { margin-top: 1rem; padding: 0.5rem 1rem; background: #3182ce; color: white; border: none; border-radius: 4px; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>¡Ups! Algo salió mal</h1>
        <p>${message}</p>
        <button onclick="window.location.href='/'">Volver al inicio</button>
      </div>
      <script>
        console.error("Error de Auth (${status}): ${message}");
        // Aquí podrías incluso disparar analíticas o limpiar el localStorage
      </script>
    </body>
    </html>
  `;

  return new Response(html, {
    status: status,
    headers: { "Content-Type": "text/html" },
  });
}
export default htmlError;