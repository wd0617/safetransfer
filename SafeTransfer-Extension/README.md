# SafeTransfer Chrome Extension

Extensión para capturar automáticamente datos de clientes y transferencias desde los sistemas de envío de dinero.

## 🚀 Sistemas Soportados

- ✅ **Western Union**
- ✅ **Ria**
- ✅ **MoneyGram**
- ✅ **Mondial Bony**

## 📦 Instalación

### Paso 1: Preparar los iconos

Antes de instalar, necesitas crear los iconos de la extensión. Puedes usar cualquier imagen PNG con estas dimensiones:
- `icon16.png` (16x16 px)
- `icon32.png` (32x32 px)
- `icon48.png` (48x48 px)
- `icon128.png` (128x128 px)

Coloca los iconos en la carpeta `icons/`.

**Tip:** Puedes usar un generador de iconos online como [favicon.io](https://favicon.io/) o crear un logo simple con el escudo de SafeTransfer.

### Paso 2: Instalar en Chrome

1. Abre Chrome y ve a `chrome://extensions/`
2. Activa el **"Modo de desarrollador"** (esquina superior derecha)
3. Click en **"Cargar descomprimida"**
4. Selecciona la carpeta `SafeTransfer-Extension`
5. ¡La extensión aparecerá en la barra de herramientas!

### Paso 3: Fijar la extensión

1. Click en el icono de puzzle (extensiones) en Chrome
2. Busca "SafeTransfer"
3. Click en el pin (📌) para fijarla en la barra

## 🎯 Cómo Usar

### Capturar datos automáticamente:

1. Abre una página de Western Union, Ria, MoneyGram o Mondial Bony
2. Navega hasta la pantalla con los datos del cliente o la transacción
3. Click en el icono de SafeTransfer en la barra de herramientas
4. Selecciona:
   - **Capturar Cliente** - Solo datos del cliente
   - **Capturar Transferencia** - Solo datos de la transferencia
   - **Capturar Todo** - Ambos datos
5. Revisa los datos en la vista previa
6. Click en **"Enviar a SafeTransfer"**

### Entrada manual:

Si la captura automática no funciona perfectamente, puedes:
1. Click en **"Entrada Manual"** en la extensión
2. Se abrirá SafeTransfer donde puedes ingresar los datos manualmente

## 🔧 Solución de Problemas

### La extensión no detecta el sistema
- Asegúrate de estar en una página oficial del sistema de envío
- Intenta recargar la página (F5)

### Los datos no se capturan correctamente
- Asegúrate de estar en la página del resumen/recibo de la transacción
- Algunos datos pueden requerir ajuste manual en SafeTransfer

### Error de permisos
- Ve a `chrome://extensions/`
- Busca SafeTransfer y verifica que todos los permisos estén activados

## 📝 Notas Técnicas

- La extensión usa Manifest V3 (compatible con Chrome moderno)
- Los datos se envían directamente a tu instancia de SafeTransfer
- No se almacenan datos en servidores externos
- La extracción usa patrones de texto, puede requerir ajustes si las páginas cambian

## 🔒 Privacidad

- La extensión solo se activa en los dominios de los sistemas de envío
- No recopila ni envía datos a terceros
- Los datos capturados se envían únicamente a tu SafeTransfer

## 📧 Soporte

Si encuentras problemas o necesitas mejoras, contacta al desarrollador.

---

**Version:** 1.0.0
**Compatibilidad:** Chrome 88+, Edge 88+
