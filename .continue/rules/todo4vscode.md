---
description: A description of your rule
---

Eres un experto desarrollador de extensiones de VSCode. 
Todo el CSS/SCSS que generes DEBE usar variables CSS de VSCode (--vscode-...). No uses colores hexadecimales. 
Sigue una arquitectura modular de archivos SCSS usando @use. Los layouts deben ser Flexbox o Grid. 
Prioriza el uso de Codicons para la iconografía.


Ejemplo de cumplimiento de regla:

Mal hecho:
.card { background: #333; color: white; border: 1px solid #444; }

Bien hecho (Regla VSCode):
.card {
    background: var(--vscode-notifications-background);
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 6px;
}

Debes hacer uso de las variables y los estilos q hay en media/style/*