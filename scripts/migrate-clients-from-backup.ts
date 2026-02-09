/**
 * Script de migración de clientes desde PythonAnywhere a SafeTransfer
 * 
 * Este script toma los datos del backup SQL y los importa a SafeTransfer (Supabase)
 * 
 * Uso: npx ts-node scripts/migrate-clients-from-backup.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gvgzxfqpduqwvjuoylxf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ID del negocio donde importar los clientes
// IMPORTANTE: Cambia esto por tu business_id real de SafeTransfer
const TARGET_BUSINESS_ID = process.env.TARGET_BUSINESS_ID || 'TU_BUSINESS_ID_AQUI';

// Datos de los clientes del backup (lista parcial - el resto se carga desde archivo)
const CLIENTES_BACKUP = [
    { id: 1, nombre: 'Wander', apellido: 'Perez', fecha_nacimiento: '1994-09-06', documento: 'ax12345', telefono: '23421234', fecha_registro: '2025-03-20 10:57:10' },
    { id: 2, nombre: 'ORNELA', apellido: 'GJYLA', fecha_nacimiento: '1987-04-12', documento: 'ca23306db', telefono: '3208868204', fecha_registro: '2025-03-20 12:18:43' },
    { id: 3, nombre: 'SANDY TEOLINDA', apellido: 'COTRINA SAVA', fecha_nacimiento: '1980-12-16', documento: 'CA00522MJ', telefono: '3297519493', fecha_registro: '2025-03-20 12:49:38' },
    { id: 4, nombre: 'ANTONIO', apellido: 'RAFANAN', fecha_nacimiento: '1970-01-17', documento: 'CA19308SZ', telefono: '3921651555', fecha_registro: '2025-03-20 12:53:19' },
    { id: 5, nombre: 'INGA', apellido: 'PEIKRISHVILI', fecha_nacimiento: '1972-12-11', documento: 'av9260670', telefono: '3804931558', fecha_registro: '2025-03-20 13:04:13' },
    // ... más clientes se cargan desde el archivo JSON
];

// Mapeo de servicios a transfer_systems
const SERVICIOS_MAP: { [key: number]: string } = {
    1: 'western_union',
    2: 'moneygram',
    3: 'ria',
    4: 'mondial_bony',
    5: 'monty'
};

// Cliente-Servicio mapping (del backup)
const CLIENTE_SERVICIOS: { [clienteId: number]: number[] } = {};

interface ClienteBackup {
    id: number;
    nombre: string;
    apellido: string;
    fecha_nacimiento: string;
    documento: string;
    telefono: string | null;
    fecha_registro: string;
}

interface SafeTransferClient {
    business_id: string;
    full_name: string;
    document_type: string;
    document_number: string;
    document_country: string;
    date_of_birth: string | null;
    nationality: string | null;
    phone: string | null;
    transfer_systems: string[];
    created_at?: string;
}

// Detecta tipo de documento basado en el formato
function detectDocumentType(documento: string): string {
    const doc = documento.toUpperCase().trim();

    // Pasaportes suelen tener formatos específicos
    if (/^[A-Z]{2}\d+$/.test(doc)) return 'passport';
    if (/^K[A-Z]\d+$/.test(doc)) return 'passport';

    // Cartas de identidad italianas
    if (/^CA\d+[A-Z]{2}$/.test(doc)) return 'id_card';
    if (/^A[VXY]\d+$/.test(doc)) return 'id_card';

    // Código fiscal italiano (16 caracteres alfanuméricos)
    if (/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(doc)) return 'fiscal_code';

    // Por defecto
    return 'id_card';
}

// Detecta nacionalidad basada en el tipo de documento o nombre
function detectNationality(documento: string): string {
    const doc = documento.toUpperCase().trim();

    // Documentos georgianos suelen empezar con ciertos patrones
    if (/^\d{2}[A-Z]{2}\d+$/.test(doc)) return 'Georgia';
    if (/^CA.*$/.test(doc)) return 'Italia';

    return 'Italia'; // Default
}

// Convierte un cliente del backup al formato de SafeTransfer
function convertToSafeTransferClient(clienteBackup: ClienteBackup, businessId: string): SafeTransferClient {
    const fullName = `${clienteBackup.nombre.trim()} ${clienteBackup.apellido.trim()}`.toUpperCase();
    const documentNumber = clienteBackup.documento.toUpperCase().trim();

    // Obtener sistemas de transferencia del cliente
    const servicios = CLIENTE_SERVICIOS[clienteBackup.id] || [];
    const transferSystems = servicios.map(sId => SERVICIOS_MAP[sId]).filter(Boolean);

    return {
        business_id: businessId,
        full_name: fullName,
        document_type: detectDocumentType(documentNumber),
        document_number: documentNumber,
        document_country: 'IT', // La mayoría son documentos italianos
        date_of_birth: clienteBackup.fecha_nacimiento || null,
        nationality: detectNationality(documentNumber),
        phone: clienteBackup.telefono?.toString().trim() || null,
        transfer_systems: transferSystems.length > 0 ? transferSystems : ['western_union'],
        created_at: clienteBackup.fecha_registro
    };
}

async function migrateClients() {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada.');
        console.log('\nPara obtenerla:');
        console.log('1. Ve a https://supabase.com/dashboard/project/gvgzxfqpduqwvjuoylxf/settings/api');
        console.log('2. Copia la "service_role key"');
        console.log('3. Ejecuta: set SUPABASE_SERVICE_ROLE_KEY=tu_key');
        process.exit(1);
    }

    if (TARGET_BUSINESS_ID === 'TU_BUSINESS_ID_AQUI') {
        console.error('❌ Error: Debes configurar TARGET_BUSINESS_ID');
        console.log('\nPara obtenerlo:');
        console.log('1. Inicia sesión en SafeTransfer');
        console.log('2. Ve a tu perfil o configuración');
        console.log('3. El business_id está en la URL o en la consola del navegador');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🚀 Iniciando migración de clientes...\n');
    console.log(`📊 Total de clientes a migrar: ${CLIENTES_BACKUP.length}`);
    console.log(`🏢 Business ID destino: ${TARGET_BUSINESS_ID}\n`);

    let migrated = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (const clienteBackup of CLIENTES_BACKUP) {
        const safetransferClient = convertToSafeTransferClient(clienteBackup as ClienteBackup, TARGET_BUSINESS_ID);

        try {
            // Verificar si ya existe
            const { data: existing } = await supabase
                .from('clients')
                .select('id')
                .eq('business_id', TARGET_BUSINESS_ID)
                .eq('document_number', safetransferClient.document_number)
                .single();

            if (existing) {
                console.log(`⏭️  Saltando (ya existe): ${safetransferClient.full_name}`);
                skipped++;
                continue;
            }

            // Insertar nuevo cliente
            const { error } = await supabase
                .from('clients')
                .insert(safetransferClient);

            if (error) {
                throw error;
            }

            console.log(`✅ Migrado: ${safetransferClient.full_name}`);
            migrated++;
        } catch (err: any) {
            console.log(`❌ Error: ${safetransferClient.full_name} - ${err.message}`);
            errors.push(`${safetransferClient.full_name}: ${err.message}`);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📋 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(50));
    console.log(`✅ Clientes migrados: ${migrated}`);
    console.log(`⏭️  Clientes saltados (ya existían): ${skipped}`);
    console.log(`❌ Errores: ${errors.length}`);

    if (errors.length > 0) {
        console.log('\n📝 Detalle de errores:');
        errors.forEach(e => console.log(`   - ${e}`));
    }
}

// Ejecutar
migrateClients().catch(console.error);
