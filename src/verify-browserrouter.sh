#!/bin/bash

# Script de verificación para la migración a BrowserRouter
# Oryon App v2.0

echo "================================================"
echo "🔍 Verificación de Migración a BrowserRouter"
echo "================================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0
WARNINGS=0

# Función para verificar archivo
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Encontrado: $1"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} No encontrado: $1"
        ((FAILED++))
        return 1
    fi
}

# Función para verificar que NO existe un archivo
check_file_not_exists() {
    if [ ! -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Correctamente eliminado: $1"
        ((PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Aún existe (debería eliminarse): $1"
        ((WARNINGS++))
        return 1
    fi
}

# Función para buscar texto en archivo
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Encontrado en $1: $2"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} No encontrado en $1: $2"
        ((FAILED++))
        return 1
    fi
}

# Función para verificar que NO existe texto
check_content_not_exists() {
    if ! grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Correctamente removido de $1: $2"
        ((PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Aún existe en $1: $2"
        ((WARNINGS++))
        return 1
    fi
}

echo "1. Verificando archivos de configuración..."
echo "-------------------------------------------"
check_file "_redirects"
check_file "vercel.json"
check_file ".htaccess"
echo ""

echo "2. Verificando archivos eliminados..."
echo "-------------------------------------------"
check_file_not_exists "hash-fix.js"
echo ""

echo "3. Verificando documentación..."
echo "-------------------------------------------"
check_file "BROWSERROUTER_MIGRATION.md"
check_file "QR_CODES_GUIDE.md"
check_file "TESTING_BROWSERROUTER.md"
check_file "README.md"
check_file "CHANGELOG.md"
echo ""

echo "4. Verificando App.tsx..."
echo "-------------------------------------------"
if [ -f "App.tsx" ]; then
    # Buscar window.location.pathname (debe existir)
    check_content "App.tsx" "window.location.pathname"
    
    # Buscar window.location.hash (NO debe existir en contexto de routing)
    # Permitimos que exista en comentarios pero no en código activo
    if grep "window.location.hash" App.tsx | grep -v "^[[:space:]]*\/\/" | grep -v "\/\*" > /dev/null; then
        echo -e "${YELLOW}⚠${NC} Advertencia: window.location.hash encontrado en App.tsx (verificar manualmente)"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC} window.location.hash correctamente removido de App.tsx"
        ((PASSED++))
    fi
    
    # Buscar función navigate
    check_content "App.tsx" "const navigate ="
    
    # Buscar popstate
    check_content "App.tsx" "popstate"
else
    echo -e "${RED}✗${NC} App.tsx no encontrado"
    ((FAILED++))
fi
echo ""

echo "5. Verificando index.html..."
echo "-------------------------------------------"
if [ -f "index.html" ]; then
    # Verificar que hash-fix.js NO esté sin comentar
    if grep "<script src=\"/hash-fix.js\">" index.html | grep -v "^[[:space:]]*<!--" > /dev/null; then
        echo -e "${YELLOW}⚠${NC} Advertencia: hash-fix.js referenciado en index.html (debería estar comentado o eliminado)"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC} hash-fix.js correctamente removido de index.html"
        ((PASSED++))
    fi
else
    echo -e "${RED}✗${NC} index.html no encontrado"
    ((FAILED++))
fi
echo ""

echo "6. Verificando Service Worker..."
echo "-------------------------------------------"
if [ -f "sw.js" ]; then
    # Buscar versión actualizada
    check_content "sw.js" "v2.0"
    
    # Buscar soporte para SPA
    if grep -q "navigate" sw.js || grep -q "BrowserRouter" sw.js; then
        echo -e "${GREEN}✓${NC} Service Worker con soporte para BrowserRouter"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Service Worker podría necesitar actualizarse para BrowserRouter"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} sw.js no encontrado (opcional)"
    ((WARNINGS++))
fi
echo ""

echo "7. Verificando estructura de directorios..."
echo "-------------------------------------------"
check_file "components/Login.tsx"
check_file "components/Register.tsx"
check_file "components/TrackingPage.tsx"
check_file "utils/supabase/client.tsx"
echo ""

echo "================================================"
echo "📊 Resumen de Verificación"
echo "================================================"
echo -e "${GREEN}Pasados:${NC} $PASSED"
echo -e "${RED}Fallidos:${NC} $FAILED"
echo -e "${YELLOW}Advertencias:${NC} $WARNINGS"
echo ""

# Resultado final
if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ ¡Migración completada exitosamente!${NC}"
    echo ""
    echo "Siguiente paso:"
    echo "1. npm run dev"
    echo "2. Probar navegación a /tracking/test/123"
    echo "3. Verificar que no hay redirecciones"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠ Migración completada con advertencias${NC}"
    echo "Por favor, revisa las advertencias arriba"
    echo ""
    echo "Si todo se ve bien:"
    echo "1. npm run dev"
    echo "2. Probar navegación a /tracking/test/123"
    exit 0
else
    echo -e "${RED}✗ Migración incompleta${NC}"
    echo "Por favor, revisa los errores arriba y completa la migración"
    echo ""
    echo "Consulta la documentación:"
    echo "- BROWSERROUTER_MIGRATION.md"
    exit 1
fi
