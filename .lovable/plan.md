

## Permitir pegar el código completo de Meta Pixel

### Problema
Actualmente el campo solo acepta números (`replace(/\D/g, "")`), por lo que si el usuario pega el snippet completo de Meta Pixel, se pierden los dígitos mezclados con texto.

### Solución
Cambiar el campo para que acepte texto libre y extraiga automáticamente el Pixel ID del código pegado. Cuando el usuario pega el snippet completo, se parsea el ID con una regex como `/fbq\('init',\s*'(\d+)'\)/` y se guarda solo el número.

### Cambios en `src/pages/Editor.tsx`

1. **Crear función `extractPixelId`** que reciba un string y:
   - Si es solo dígitos, lo retorne tal cual.
   - Si contiene `fbq('init', 'XXXX')`, extraiga el ID con regex.
   - Si no encuentra nada, retorne el string limpio de no-dígitos.

2. **Cambiar el input**:
   - Reemplazar `onChange` para usar `extractPixelId` en vez de `replace(/\D/g, "")`.
   - Usar `<Textarea>` en vez de `<Input>` para que el código completo quepa al pegar.
   - Actualizar el placeholder: `"Pegá el código del Pixel o solo el ID numérico"`.
   - Mostrar debajo el ID extraído si se detectó uno.

