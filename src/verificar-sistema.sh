#!/bin/bash

# Script de Verificación Rápida - BrowserRouter
# Verifica que el sistema esté correctamente configurado sin referencias a hash

echo "🔍 Verificando Configuración de BrowserRouter..."
echo "================================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Verificar referencias a window.location.hash
echo "1. Verificando referencias a window.location.hash..."
HASH_REFS=$(grep -r "window.location.hash" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules 2>/dev/null | wc -l)

if [ "$HASH_REFS" -gt 0 ]; then
    echo -e "${RED}✗${NC} Encontradas $HASH_REFS referencias a window.location.hash"
    grep -r "window.location.hash" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules -n 2>/dev/null
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} No hay referencias a window.location.hash"
fi
echo ""

# Verificar event listeners hashchange
echo "2. Verificando event listeners 'hashchange'..."
HASHCHANGE_REFS=$(grep -r "hashchange" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules 2>/dev/null | wc -l)

if [ "$HASHCHANGE_REFS" -gt 0 ]; then
    echo -e "${RED}✗${NC} Encontradas $HASHCHANGE_REFS referencias a 'hashchange'"
    grep -r "hashchange" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules -n 2>/dev/null
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} No hay referencias a 'hashchange'"
fi
echo ""

# Verificar uso de pathname
echo "3. Verificando uso de window.location.pathname..."
PATHNAME_REFS=$(grep -r "window.location.pathname" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules 2>/dev/null | wc -l)

if [ "$PATHNAME_REFS" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Encontradas $PATHNAME_REFS referencias correctas a pathname"
else
    echo -e "${YELLOW}⚠${NC} No se encontraron referencias a pathname (puede ser un problema)"
    ((WARNINGS++))
fi
echo ""

# Verificar event listener popstate
echo "4. Verificando event listener 'popstate'..."
POPSTATE_REFS=$(grep -r "popstate" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules 2>/dev/null | wc -l)

if [ "$POPSTATE_REFS" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Encontradas $POPSTATE_REFS referencias a 'popstate'"
else
    echo -e "${YELLOW}⚠${NC} No se encontraron referencias a 'popstate'"
    ((WARNINGS++))
fi
echo ""

# Verificar archivo _redirects
echo "5. Verificando archivo _redirects..."
if [ -f "_redirects" ]; then
    echo -e "${GREEN}✓${NC} Archivo _redirects existe"
    if grep -q "/*.*index.html.*200" _redirects; then
        echo -e "${GREEN}✓${NC} Configuración correcta en _redirects"
    else
        echo -e "${RED}✗${NC} Configuración incorrecta en _redirects"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} Archivo _redirects NO existe"
    ((ERRORS++))
fi
echo ""

# Verificar archivo vercel.json
echo "6. Verificando archivo vercel.json..."
if [ -f "vercel.json" ]; then
    echo -e "${GREEN}✓${NC} Archivo vercel.json existe"
    if grep -q "rewrites" vercel.json && grep -q "index.html" vercel.json; then
        echo -e "${GREEN}✓${NC} Configuración correcta en vercel.json"
    else
        echo -e "${RED}✗${NC} Configuración incorrecta en vercel.json"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} Archivo vercel.json NO existe (solo necesario para Vercel)"
    ((WARNINGS++))
fi
echo ""

# Verificar función navigate en App.tsx
echo "7. Verificando función navigate() en App.tsx..."
if [ -f "App.tsx" ]; then
    if grep -q "const navigate.*pushState" App.tsx; then
        echo -e "${GREEN}✓${NC} Función navigate() encontrada en App.tsx"
    else
        echo -e "${RED}✗${NC} Función navigate() NO encontrada en App.tsx"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} Archivo App.tsx NO existe"
    ((ERRORS++))
fi
echo ""

# Verificar que hash-to-path-redirect.js NO exista
echo "8. Verificando que scripts de compatibilidad estén eliminados..."
if [ -f "hash-to-path-redirect.js" ]; then
    echo -e "${YELLOW}⚠${NC} Advertencia: hash-to-path-redirect.js existe (debe eliminarse para sistema puro)"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} Scripts de compatibilidad eliminados correctamente"
fi
echo ""

# Verificar index.html
echo "9. Verificando index.html..."
if [ -f "index.html" ]; then
    if grep -q "hash-to-path-redirect.js" index.html || grep -q "hash-fix.js" index.html; then
        echo -e "${YELLOW}⚠${NC} index.html tiene referencias a scripts de hash"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC} index.html sin referencias a scripts de hash"
    fi
else
    echo -e "${RED}✗${NC} Archivo index.html NO existe"
    ((ERRORS++))
fi
echo ""

# Resumen
echo "================================================"
echo "RESUMEN DE VERIFICACIÓN"
echo "================================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ SISTEMA COMPLETAMENTE CONFIGURADO${NC}"
    echo -e "${GREEN}✓ 0 errores, 0 advertencias${NC}"
    echo ""
    echo "El sistema está listo para usar BrowserRouter."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ CONFIGURACIÓN MAYORMENTE CORRECTA${NC}"
    echo -e "${YELLOW}⚠ 0 errores, $WARNINGS advertencias${NC}"
    echo ""
    echo "El sistema debería funcionar, pero hay advertencias que revisar."
    exit 0
else
    echo -e "${RED}✗ PROBLEMAS ENCONTRADOS${NC}"
    echo -e "${RED}✗ $ERRORS errores, $WARNINGS advertencias${NC}"
    echo ""
    echo "Por favor, corrige los errores antes de continuar."
    exit 1
fi
