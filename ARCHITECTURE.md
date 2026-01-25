# Arquitectura de ToDo4VCode

Este documento describe la arquitectura de la extensión ToDo4VCode y cómo agregar nuevas funcionalidades.

## Estructura de Carpetas

```
src/
├── core/                    # Lógica de negocio central
│   ├── models/              # Tipos e interfaces
│   │   ├── task.ts          # Modelos de tareas
│   │   ├── settings.ts      # Modelos de configuración
│   │   ├── webview-messages.ts  # Tipos de mensajes del webview
│   │   └── index.ts         # Exportaciones
│   ├── services/            # Servicios de negocio
│   │   ├── TaskService.ts   # CRUD de tareas
│   │   ├── ConfigService.ts # Gestión de configuración
│   │   ├── ReminderService.ts  # Gestión de recordatorios
│   │   └── StatisticsService.ts # Cálculo de estadísticas
│   └── storage/             # Gestión de almacenamiento
│       └── StorageManager.ts
├── ui/                      # Componentes de UI
│   ├── providers/           # Webview providers
│   │   ├── TaskViewProvider.ts
│   │   └── ConfigViewProvider.ts (futuro)
│   ├── panels/              # Paneles full-screen
│   │   └── FullScreenPanel.ts
│   ├── statusbar/           # Status bar
│   │   └── StatusBarManager.ts
│   └── webview/             # Webview handlers y HTML
│       ├── handlers/        # Handlers específicos por tipo de mensaje
│       │   ├── TaskHandler.ts
│       │   ├── SettingsHandler.ts
│       │   ├── ChatHandler.ts
│       │   └── BaseHandler.ts
│       ├── TaskWebview.ts   # Generación de HTML
│       └── WebviewMessageRouter.ts
├── utils/                   # Utilidades
│   ├── logger.ts            # Sistema de logging
│   ├── validators.ts        # Validación de mensajes
│   └── sound-player.ts      # Reproducción de sonidos
├── commands/                # Comandos de VSCode
│   ├── refresh.ts
│   ├── openFull.ts
│   ├── openTaskModal.ts
│   └── index.ts
└── extension.ts             # Punto de entrada (solo orquestación)

media/                       # Archivos de media y recursos
├── icon.svg, icon.png       # Iconos de la extensión
├── ding-ding-alert.mp3      # Sonido de notificación
├── main.js                  # JavaScript del webview
├── flatpickr.*              # Librería de date picker
├── styles/                  # Estilos SCSS y CSS compilado
│   ├── main.scss           # Archivo principal SCSS
│   ├── base/               # Estilos base
│   ├── components/         # Componentes
│   ├── layouts/            # Layouts
│   └── vendors/            # Librerías externas
└── preview/                 # Imágenes de preview para README
```

## Principios Arquitectónicos

### Separación de Responsabilidades

- **Core**: Contiene toda la lógica de negocio, independiente de VSCode
- **UI**: Contiene componentes específicos de UI de VSCode
- **Utils**: Utilidades reutilizables
- **Commands**: Comandos de VSCode, cada uno en su propio archivo

### Servicios

Los servicios están organizados por responsabilidad:

- **TaskService**: Operaciones CRUD de tareas
- **ReminderService**: Gestión de recordatorios
- **StatisticsService**: Cálculo de estadísticas
- **ConfigService**: Gestión de configuración de VSCode

### Handlers Modulares

Los mensajes del webview se manejan mediante handlers especializados:

- **TaskHandler**: Operaciones relacionadas con tareas
- **SettingsHandler**: Configuración de vistas
- **ChatHandler**: Integración con chat de VSCode
- **BaseHandler**: Clase base con manejo de errores común

## Cómo Agregar una Nueva Vista de Configuración

Para agregar una nueva vista de configuración (por ejemplo, `ConfigViewProvider`):

### 1. Crear el Provider

Crear `src/ui/providers/ConfigViewProvider.ts`:

```typescript
import * as vscode from 'vscode';
import { ConfigService } from '../../core/services/ConfigService';
import { WebviewMessageRouter } from '../webview/WebviewMessageRouter';

export class ConfigViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'todo4vcode-config-view';

    private _view?: vscode.WebviewView;
    private readonly _messageRouter: WebviewMessageRouter;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _taskService: TaskService
    ) {
        this._messageRouter = new WebviewMessageRouter(_taskService);
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this._view = webviewView;
        // Configurar webview y HTML
    }
}
```

### 2. Registrar en package.json

Agregar la vista en `package.json`:

```json
{
  "contributes": {
    "views": {
      "todo4vcode-explorer": [
        {
          "type": "webview",
          "id": "todo4vcode-config-view",
          "name": "Configuration",
          "icon": "./media/icon.svg"
        }
      ]
    }
  }
}
```

### 3. Registrar en extension.ts

```typescript
const configProvider = new ConfigViewProvider(context.extensionUri, taskService);
context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ConfigViewProvider.viewType, configProvider)
);
```

### 4. Crear Handler si es Necesario

Si la nueva vista necesita manejar mensajes específicos, crear un nuevo handler en `src/ui/webview/handlers/` y registrarlo en `WebviewMessageRouter`.

## Cómo Agregar un Nuevo Comando

### 1. Crear el Archivo del Comando

Crear `src/commands/miComando.ts`:

```typescript
import * as vscode from 'vscode';

export function registerMiComandoCommand(
    context: vscode.ExtensionContext,
    // parámetros necesarios
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('todo4vcode.miComando', () => {
            // Lógica del comando
        })
    );
}
```

### 2. Exportar en index.ts

```typescript
export * from './miComando';
```

### 3. Registrar en extension.ts

```typescript
import { registerMiComandoCommand } from './commands';

registerMiComandoCommand(context, /* parámetros */);
```

### 4. Agregar en package.json

```json
{
  "contributes": {
    "commands": [
      {
        "command": "todo4vcode.miComando",
        "title": "Mi Comando"
      }
    ]
  }
}
```

## Flujo de Mensajes del Webview

1. El webview envía un mensaje mediante `postMessage`
2. `WebviewMessageRouter` recibe el mensaje
3. `MessageValidator` valida el mensaje
4. El router enruta el mensaje al handler apropiado
5. El handler procesa el mensaje y actualiza el estado
6. Los cambios se propagan mediante eventos

## Logging

Usar `Logger` para logging estructurado:

```typescript
import { Logger } from '../utils/logger';

Logger.debug('Mensaje de debug');
Logger.info('Información');
Logger.warn('Advertencia');
Logger.error('Error', error);
```

## Validación de Mensajes

Todos los mensajes del webview deben ser validados usando `MessageValidator`:

```typescript
import { MessageValidator } from '../utils/validators';

if (MessageValidator.validate(message)) {
    // Procesar mensaje
}
```

## Gestión de Archivos Media

### Constantes Centralizadas (MEDIA_PATHS)

Todas las rutas de archivos de media están centralizadas en `src/core/constants/media-paths.ts`:

```typescript
import { MEDIA_PATHS } from '../core/constants/media-paths';

// ✅ CORRECTO: Usar constantes
const iconUri = vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.ICON);
const soundUri = vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.SOUND_ALERT);

// ❌ INCORRECTO: Rutas hardcodeadas
const iconUri = vscode.Uri.joinPath(extensionUri, 'media/icon.svg');
```

### Estructura de Media

```
media/
├── icon.svg, icon.png, icon-dark.svg, icon-light.svg  # Iconos
├── ding-ding-alert.mp3                                 # Sonido de notificación
├── main.js                                             # JavaScript del webview
├── flatpickr.min.css, flatpickr_dark.css, flatpickr.min.js  # Date picker
├── styles/                                             # Estilos SCSS
│   ├── main.scss (editar este, no main.css)
│   ├── base/      # Variables y reset
│   ├── components/ # Botones, cards, modals, popovers
│   ├── layouts/   # Kanban, list, navigation
│   └── vendors/    # Librerías externas
└── preview/        # Imágenes para README
```

### Uso de MEDIA_PATHS

**Archivos que usan media:**

1. **TaskWebview.ts**: Carga CSS, JS y recursos del webview
   ```typescript
   const styleUri = webview.asWebviewUri(
       vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.STYLES_MAIN_CSS)
   );
   ```

2. **FullScreenPanel.ts**: Define icono del panel
   ```typescript
   iconPath: {
       light: vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.ICON),
       dark: vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.ICON)
   }
   ```

3. **SoundPlayer.ts**: Reproduce sonido de notificación
   ```typescript
   const soundPath = vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.SOUND_ALERT);
   ```

### Agregar Nuevos Archivos de Media

1. Agregar el archivo en la carpeta `media/` apropiada
2. Agregar la constante en `src/core/constants/media-paths.ts`:
   ```typescript
   export const MEDIA_PATHS = {
       // ... constantes existentes
       NUEVO_ARCHIVO: 'media/ruta/al/archivo.ext'
   } as const;
   ```
3. Usar la constante en el código:
   ```typescript
   import { MEDIA_PATHS } from '../core/constants/media-paths';
   const uri = vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.NUEVO_ARCHIVO);
   ```

### Compilación de Estilos

Los archivos SCSS se compilan automáticamente:

```bash
npm run compile:sass  # Compila main.scss → main.css
npm run compile      # Compila TypeScript + SASS
```

**Importante**: Nunca editar `main.css` directamente, solo editar `main.scss`.

## Mejores Prácticas

### 1. Separación de Concerns
- **Core**: Lógica de negocio independiente de VSCode
- **UI**: Componentes específicos de VSCode
- **Utils**: Utilidades reutilizables
- **Commands**: Cada comando en su propio archivo

### 2. Type Safety
- Usar tipos estrictos, evitar `any`
- Definir interfaces para todos los modelos
- Usar tipos union para estados y opciones limitadas
- Validar mensajes del webview con `MessageValidator`

### 3. Manejo de Errores
- Siempre usar try-catch en operaciones asíncronas
- Registrar errores con `Logger.error()`
- No silenciar errores, siempre loguearlos
- Proporcionar mensajes de error descriptivos

```typescript
try {
    await someAsyncOperation();
} catch (error) {
    Logger.error('Error description', error);
    // Manejar el error apropiadamente
}
```

### 4. Gestión de Recursos
- **MEDIA_PATHS**: Siempre usar constantes centralizadas, nunca rutas hardcodeadas
- **Disposables**: Implementar `Disposable` para limpiar recursos (eventos, timeouts, etc.)
- **Eventos**: Usar eventos para comunicación entre componentes
- **Subscriptions**: Registrar todas las suscripciones en `context.subscriptions`

```typescript
export class MyService implements vscode.Disposable {
    private readonly _onChange = new vscode.EventEmitter<string>();
    public readonly onChange = this._onChange.event;
    
    public dispose(): void {
        this._onChange.dispose();
    }
}
```

### 5. Servicios Testeables
- Los servicios deben ser independientes de VSCode cuando sea posible
- Usar inyección de dependencias
- Separar lógica de negocio de acceso a APIs de VSCode

### 6. Logging Estructurado
- Usar `Logger` con niveles apropiados:
  - `Logger.debug()`: Información de debugging
  - `Logger.info()`: Información general
  - `Logger.warn()`: Advertencias
  - `Logger.error()`: Errores con contexto

### 7. Validación de Datos
- Validar todos los mensajes del webview antes de procesar
- Usar `MessageValidator.validate()` para validación
- Rechazar mensajes inválidos con logging apropiado

### 8. Naming Conventions
- **Clases**: PascalCase (`TaskService`, `StatusBarManager`)
- **Funciones/Métodos**: camelCase (`getTasks`, `updateStatus`)
- **Constantes**: UPPER_SNAKE_CASE (`MEDIA_PATHS`, `STORAGE_KEY`)
- **Variables privadas**: Prefijo `_` (`_taskService`, `_view`)

### 9. Organización de Código
- Un archivo por clase/función principal
- Agrupar funcionalidades relacionadas
- Mantener archivos pequeños y enfocados
- Usar `index.ts` para exportaciones públicas

### 10. Documentación
- Documentar funciones públicas complejas
- Comentar decisiones arquitectónicas importantes
- Mantener README y ARCHITECTURE.md actualizados
- Usar nombres descriptivos en lugar de comentarios cuando sea posible
