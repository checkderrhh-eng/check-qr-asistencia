const { useState, useEffect, useRef } = React;

// ==================== UTILIDADES FIREBASE ====================

const FirebaseDB = {
    empresas: () => db.collection('empresas'),
    usuarios: () => db.collection('usuarios'),
    marcaciones: () => db.collection('marcaciones'),

    async initializeData() {
        try {
            const empresasSnapshot = await this.empresas().limit(1).get();
            
            if (empresasSnapshot.empty) {
                const empresaRef = await this.empresas().add({
                    nombre: 'Empresa Demo S.A.',
                    ruc: '80012345-6',
                    direccion: 'Asunción, Paraguay',
                    createdAt: new Date()
                });

                await this.usuarios().add({
                    empresaId: empresaRef.id,
                    legajo: '1001',
                    nombre: 'Juan Pérez',
                    email: 'juan@empresa.com',
                    password: '1234',
                    departamento: 'Ventas',
                    rol: 'empleado',
                    horarioEntrada: '08:00',
                    horarioSalida: '17:00',
                    horarioAlmuerzoSalida: '12:00',
                    horarioAlmuerzoEntrada: '13:00',
                    qrCode: 'EMP-1001-ABC123',
                    createdAt: new Date()
                });

                await this.usuarios().add({
                    empresaId: empresaRef.id,
                    legajo: 'ADMIN',
                    nombre: 'Admin Empresa Demo',
                    email: 'admin@empresa.com',
                    password: 'admin123',
                    departamento: 'RRHH',
                    rol: 'admin',
                    horarioEntrada: '08:00',
                    horarioSalida: '17:00',
                    horarioAlmuerzoSalida: '12:00',
                    horarioAlmuerzoEntrada: '13:00',
                    createdAt: new Date()
                });

                await this.usuarios().add({
                    empresaId: null,
                    legajo: 'SUPER',
                    nombre: 'Super Administrador',
                    email: 'super@checkrrhh.com',
                    password: 'super123',
                    departamento: 'Check de RRHH',
                    rol: 'superadmin',
                    horarioEntrada: '08:00',
                    horarioSalida: '17:00',
                    createdAt: new Date()
                });

                console.log('✅ Datos iniciales creados en Firebase');
            }
        } catch (error) {
            console.error('Error inicializando datos:', error);
        }
    },

    async login(email, password) {
        try {
            const snapshot = await this.usuarios()
                .where('email', '==', email)
                .where('password', '==', password)
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error en login:', error);
            return null;
        }
    }
};

// Función para convertir imagen a Base64
const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// ==================== COMPONENTES ====================

const Logo = ({ className = "w-12 h-12" }) => (
    <svg viewBox="0 0 100 100" className={className}>
        <circle cx="50" cy="50" r="45" fill="#38BDF8"/>
        <path d="M35 50 L45 60 L65 40" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const BrandingFooter = () => (
    <div className="text-center py-4 text-gray-500 text-sm">
        <div className="flex items-center justify-center space-x-2">
            <span>Una app de</span>
            <Logo className="w-6 h-6" />
            <span className="font-semibold text-[#38BDF8]">Check de Recursos Humanos</span>
        </div>
    </div>
);

// ==================== PANTALLA LOGIN ====================

const LoginScreen = ({ onLogin, onKiosko }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        const usuario = await FirebaseDB.login(email, password);
        
        if (usuario) {
            onLogin(usuario);
        } else {
            setError('Credenciales incorrectas');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#7DD3FC] to-[#38BDF8] flex flex-col">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                    <div className="text-center mb-8">
                        <Logo className="w-20 h-20 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold text-gray-800">Check de Asistencia</h1>
                        <p className="text-gray-600 mt-2">Sistema con Código QR</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4 mb-4">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#38BDF8] focus:outline-none"
                            placeholder="Email"
                            required
                            disabled={loading}
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#38BDF8] focus:outline-none"
                            placeholder="Contraseña"
                            required
                            disabled={loading}
                        />
                        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                        <button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-[#38BDF8] to-[#0EA5E9] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>

                    <div className="border-t pt-4">
                        <button onClick={onKiosko} className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-all">
                            📱 Modo Kiosco (Escanear QR)
                        </button>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
                        <p className="font-semibold mb-1">Usuarios de prueba:</p>
                        <p><strong>Super Admin:</strong> super@checkrrhh.com / super123</p>
                        <p><strong>Admin Empresa:</strong> admin@empresa.com / admin123</p>
                        <p><strong>Empleado:</strong> juan@empresa.com / 1234</p>
                    </div>
                </div>
            </div>
            <BrandingFooter />
        </div>
    );
};

// ==================== PANTALLA KIOSCO CON JUSTIFICATIVOS ====================

const KioskoScreen = ({ onBack }) => {
    const [scanning, setScanning] = useState(false);
    const [lastScan, setLastScan] = useState(null);
    const [message, setMessage] = useState('');
    const [empresaActual, setEmpresaActual] = useState(null);
    const [showJustificativoModal, setShowJustificativoModal] = useState(false);
    const [justificativoData, setJustificativoData] = useState({ motivo: '', imagen: null });
    const [pendingMarcacion, setPendingMarcacion] = useState(null);
    const scannerRef = useRef(null);

    useEffect(() => {
        loadEmpresa();
        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.stop();
                } catch (e) {}
            }
        };
    }, []);

    const loadEmpresa = async () => {
        const snapshot = await FirebaseDB.empresas().limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            setEmpresaActual({ id: doc.id, ...doc.data() });
        }
    };

    const startScanner = () => {
        setScanning(true);
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
                processQRCode(decodedText);
            },
            () => {}
        ).catch(err => {
            console.error('Error iniciando scanner:', err);
            setMessage('❌ Error al acceder a la cámara. Verifica los permisos.');
            setScanning(false);
        });
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
                setScanning(false);
            }).catch(() => {
                setScanning(false);
            });
        }
    };

    const processQRCode = async (qrData) => {
        try {
            const snapshot = await FirebaseDB.usuarios().where('qrCode', '==', qrData).limit(1).get();

            if (snapshot.empty) {
                setMessage('❌ QR no válido');
                setTimeout(() => setMessage(''), 3000);
                return;
            }

            const empleadoDoc = snapshot.docs[0];
            const empleado = { id: empleadoDoc.id, ...empleadoDoc.data() };

            const today = new Date().toISOString().split('T')[0];
            const now = new Date();
            const hora = now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

            const marcacionesSnapshot = await FirebaseDB.marcaciones()
                .where('usuarioId', '==', empleado.id)
                .where('fecha', '==', today)
                .get();

            const marcacionesHoy = [];
            marcacionesSnapshot.forEach(doc => marcacionesHoy.push(doc.data()));
            marcacionesHoy.sort((a, b) => a.hora.localeCompare(b.hora));
            
            let tipo = 'entrada';
            const ultimaMarcacion = marcacionesHoy[marcacionesHoy.length - 1];
            
            if (ultimaMarcacion) {
                if (ultimaMarcacion.tipo === 'entrada') {
                    tipo = 'salida_almuerzo';
                } else if (ultimaMarcacion.tipo === 'salida_almuerzo') {
                    tipo = 'entrada_almuerzo';
                } else if (ultimaMarcacion.tipo === 'entrada_almuerzo') {
                    tipo = 'salida';
                } else if (ultimaMarcacion.tipo === 'salida') {
                    setMessage('⚠️ Ya registraste salida hoy');
                    setTimeout(() => setMessage(''), 3000);
                    return;
                }
            }

            let estado = 'normal';
            let requiereJustificativo = false;

            if (tipo === 'entrada' && hora > empleado.horarioEntrada) {
                estado = 'tarde';
                requiereJustificativo = true;
            }

            const marcacionData = {
                usuarioId: empleado.id,
                empresaId: empleado.empresaId,
                empresaNombre: empresaActual?.nombre || 'Sin empresa',
                usuarioNombre: empleado.nombre,
                legajo: empleado.legajo,
                tipo,
                hora,
                fecha: today,
                estado,
                timestamp: new Date()
            };

            if (requiereJustificativo) {
                setPendingMarcacion(marcacionData);
                setShowJustificativoModal(true);
                stopScanner();
            } else {
                await guardarMarcacion(marcacionData);
            }
        } catch (error) {
            console.error('Error procesando QR:', error);
            setMessage('❌ Error al procesar QR');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const guardarMarcacion = async (marcacionData) => {
        try {
            await FirebaseDB.marcaciones().add({
                ...marcacionData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            const tipoTexto = marcacionData.tipo === 'entrada' ? 'ENTRADA' :
                             marcacionData.tipo === 'salida_almuerzo' ? 'SALIDA ALMUERZO' :
                             marcacionData.tipo === 'entrada_almuerzo' ? 'ENTRADA ALMUERZO' :
                             'SALIDA';

            setLastScan({
                nombre: marcacionData.usuarioNombre,
                tipo: tipoTexto,
                hora: marcacionData.hora,
                estado: marcacionData.estado
            });

            setMessage(`✅ ${tipoTexto} registrada: ${marcacionData.usuarioNombre}`);
            
            setTimeout(() => {
                setMessage('');
                setLastScan(null);
            }, 5000);
        } catch (error) {
            console.error('Error guardando marcación:', error);
            setMessage('❌ Error al guardar marcación');
        }
    };

    const handleJustificativoSubmit = async () => {
        if (!justificativoData.motivo) {
            alert('Por favor ingresa el motivo');
            return;
        }

        const marcacionConJustificativo = {
            ...pendingMarcacion,
            justificativo: {
                motivo: justificativoData.motivo,
                imagen: justificativoData.imagen,
                fechaSubida: new Date().toISOString()
            }
        };

        await guardarMarcacion(marcacionConJustificativo);
        setShowJustificativoModal(false);
        setJustificativoData({ motivo: '', imagen: null });
        setPendingMarcacion(null);
    };

    const handleImagenChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5000000) {
                alert('La imagen no debe superar los 5MB');
                return;
            }
            const base64 = await imageToBase64(file);
            setJustificativoData({ ...justificativoData, imagen: base64 });
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <div className="bg-gradient-to-r from-[#38BDF8] to-[#0EA5E9] text-white p-6">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex items-center space-x-3">
                        <Logo className="w-10 h-10" />
                        <div>
                            <h1 className="text-2xl font-bold">Modo Kiosco</h1>
                            {empresaActual && (
                                <p className="text-sm opacity-90">{empresaActual.nombre}</p>
                            )}
                        </div>
                    </div>
                    <button onClick={onBack} className="bg-white text-[#38BDF8] px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all">
                        Salir
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-4xl mx-auto p-6 w-full">
                {message && (
                    <div className={`mb-6 p-4 rounded-xl text-center font-bold text-lg ${
                        message.includes('✅') ? 'bg-green-100 text-green-800' : 
                        message.includes('❌') ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                        {message}
                    </div>
                )}

                {lastScan && (
                    <div className="mb-6 bg-white rounded-2xl p-6 shadow-lg border-4 border-green-500">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">✅ Última Marcación</h3>
                        <p className="text-3xl font-bold text-[#38BDF8] mb-4">{lastScan.nombre}</p>
                        <div className="flex items-center justify-between">
                            <span className="px-6 py-3 rounded-full font-bold text-lg bg-green-500 text-white">
                                {lastScan.tipo}
                            </span>
                            <span className="text-4xl font-bold text-gray-800">{lastScan.hora}</span>
                        </div>
                        {lastScan.estado === 'tarde' && (
                            <p className="mt-4 text-orange-600 font-bold text-lg">⚠️ Llegada Tarde - Justificativo registrado</p>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                        {scanning ? '📷 Escanea tu gafete QR' : 'Iniciar escaneo de QR'}
                    </h2>
                    
                    <div id="reader" className="mb-4"></div>

                    {!scanning ? (
                        <button onClick={startScanner} className="w-full bg-[#38BDF8] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#0EA5E9] transition-all">
                            📷 Activar Cámara
                        </button>
                    ) : (
                        <button onClick={stopScanner} className="w-full bg-red-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-600 transition-all">
                            ⏹️ Detener Cámara
                        </button>
                    )}
                </div>

                <div className="mt-6 bg-blue-50 rounded-xl p-4 text-center text-blue-700">
                    <p className="font-semibold text-lg">📱 Acerca tu gafete QR a la cámara</p>
                    <p className="text-sm mt-2">Si llegas tarde, se te pedirá adjuntar un justificativo</p>
                    <p className="text-xs mt-2 text-green-600">✅ Conectado a la nube</p>
                </div>
            </div>

            {/* Modal Justificativo */}
            {showJustificativoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-orange-600 mb-4">⚠️ Llegada Tarde - Justificativo Requerido</h3>
                        <p className="text-gray-700 mb-4">Por favor adjunta el motivo de tu llegada tarde:</p>
                        
                        <textarea
                            value={justificativoData.motivo}
                            onChange={(e) => setJustificativoData({...justificativoData, motivo: e.target.value})}
                            className="w-full px-4 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none h-24 mb-4"
                            placeholder="Ej: Tráfico en la ruta, problema personal, etc."
                        />

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Adjuntar comprobante (opcional)
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImagenChange}
                                className="w-full px-4 py-2 border-2 rounded-lg"
                            />
                            {justificativoData.imagen && (
                                <p className="text-green-600 text-sm mt-2">✅ Imagen adjuntada</p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowJustificativoModal(false);
                                    setPendingMarcacion(null);
                                    setJustificativoData({ motivo: '', imagen: null });
                                }}
                                className="flex-1 bg-gray-200 py-2 rounded-lg font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleJustificativoSubmit}
                                className="flex-1 bg-[#38BDF8] text-white py-2 rounded-lg font-semibold"
                            >
                                Registrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BrandingFooter />
        </div>
    );
};

// Continúa en el siguiente mensaje...
