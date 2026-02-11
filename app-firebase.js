const { useState, useEffect, useRef } = React;

// ==================== UTILIDADES FIREBASE ====================

const FirebaseDB = {
    // Colecciones
    empresas: () => db.collection('empresas'),
    usuarios: () => db.collection('usuarios'),
    marcaciones: () => db.collection('marcaciones'),
    adjuntos: () => db.collection('adjuntos'),

    // Inicializar datos de prueba
    async initializeData() {
        try {
            // Verificar si ya hay empresas
            const empresasSnapshot = await this.empresas().limit(1).get();
            
            if (empresasSnapshot.empty) {
                // Crear empresa demo
                const empresaRef = await this.empresas().add({
                    nombre: 'Empresa Demo S.A.',
                    ruc: '80012345-6',
                    direccion: 'Asunción, Paraguay',
                    createdAt: new Date()
                });

                // Crear usuarios demo
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

                console.log('✅ Datos iniciales creados');
            }
        } catch (error) {
            console.error('Error inicializando datos:', error);
        }
    },

    // Login
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
    },

    // Actualizar usuario
    async updateUsuario(id, data) {
        try {
            await this.usuarios().doc(id).update({
                ...data,
                updatedAt: new Date()
            });
            return true;
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            return false;
        }
    },

    // Eliminar usuario
    async deleteUsuario(id) {
        try {
            await this.usuarios().doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            return false;
        }
    },

    // Eliminar empresa y todos sus datos relacionados
    async deleteEmpresa(empresaId) {
        try {
            // 1. Eliminar todos los usuarios de la empresa
            const usuariosSnapshot = await this.usuarios()
                .where('empresaId', '==', empresaId)
                .get();
            
            const deleteUsuariosPromises = usuariosSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(deleteUsuariosPromises);
            console.log(`✅ ${usuariosSnapshot.docs.length} usuarios eliminados`);

            // 2. Eliminar todas las marcaciones de la empresa
            const marcacionesSnapshot = await this.marcaciones()
                .where('empresaId', '==', empresaId)
                .get();
            
            const deleteMarcacionesPromises = marcacionesSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(deleteMarcacionesPromises);
            console.log(`✅ ${marcacionesSnapshot.docs.length} marcaciones eliminadas`);

            // 3. Eliminar adjuntos relacionados (por usuarioId)
            const usuariosIds = usuariosSnapshot.docs.map(doc => doc.id);
            const adjuntosPromises = usuariosIds.map(async (usuarioId) => {
                const adjuntosSnapshot = await this.adjuntos()
                    .where('usuarioId', '==', usuarioId)
                    .get();
                return adjuntosSnapshot.docs.map(doc => doc.ref.delete());
            });
            
            const allAdjuntosPromises = (await Promise.all(adjuntosPromises)).flat();
            await Promise.all(allAdjuntosPromises);
            console.log(`✅ ${allAdjuntosPromises.length} adjuntos eliminados`);

            // 4. Finalmente, eliminar la empresa
            await this.empresas().doc(empresaId).delete();
            console.log('✅ Empresa eliminada correctamente');

            return true;
        } catch (error) {
            console.error('Error eliminando empresa:', error);
            return false;
        }
    },

    // Guardar adjunto (almacenado como base64 en Firestore)
    async saveAdjunto(marcacionId, usuarioId, archivo, tipo, comentario) {
        try {
            await this.adjuntos().add({
                marcacionId: marcacionId,
                usuarioId: usuarioId,
                archivo: archivo, // Base64
                tipo: tipo, // 'justificativo', 'certificado', 'otro'
                comentario: comentario,
                createdAt: new Date()
            });
            return true;
        } catch (error) {
            console.error('Error guardando adjunto:', error);
            return false;
        }
    },

    // Obtener adjuntos de una marcación específica
    async getAdjuntosByMarcacion(marcacionId) {
        try {
            const snapshot = await this.adjuntos()
                .where('marcacionId', '==', marcacionId)
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo adjuntos:', error);
            return [];
        }
    },

    // Obtener todos los adjuntos de una empresa
    async getAllAdjuntos(empresaId, usuarioId = null) {
        try {
            let query = this.adjuntos();
            
            // Si se especifica un usuario, filtrar por él
            if (usuarioId) {
                query = query.where('usuarioId', '==', usuarioId);
            }
            
            const snapshot = await query.get();
            const adjuntos = [];
            
            for (const doc of snapshot.docs) {
                const adjunto = { id: doc.id, ...doc.data() };
                
                // Obtener datos de la marcación asociada
                if (adjunto.marcacionId) {
                    const marcacionDoc = await this.marcaciones().doc(adjunto.marcacionId).get();
                    if (marcacionDoc.exists) {
                        const marcacion = marcacionDoc.data();
                        // Filtrar por empresa
                        if (marcacion.empresaId === empresaId) {
                            adjunto.marcacion = marcacion;
                            adjunto.fecha = marcacion.fecha;
                            adjunto.empleadoNombre = marcacion.usuarioNombre;
                            adjuntos.push(adjunto);
                        }
                    }
                }
            }
            
            return adjuntos;
        } catch (error) {
            console.error('Error obteniendo adjuntos:', error);
            return [];
        }
    },

    // Actualizar marcación con ID de adjunto
    async updateMarcacionWithAdjunto(marcacionId, adjuntoId) {
        try {
            await this.marcaciones().doc(marcacionId).update({
                adjuntoId: adjuntoId,
                tieneJustificativo: true,
                updatedAt: new Date()
            });
            return true;
        } catch (error) {
            console.error('Error actualizando marcación:', error);
            return false;
        }
    }
};

// ==================== COMPONENTES ====================

const Logo = ({ className = "w-12 h-12" }) => (
    <svg viewBox="0 0 100 100" className={className}>
        <circle cx="50" cy="50" r="45" fill="#38BDF8"/>
        <path d="M35 50 L45 60 L65 40" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const BrandingFooter = () => (
    <div className="text-center py-4 text-white text-sm">
        <div className="flex items-center justify-center space-x-2">
            <span>Una app de</span>
            <Logo className="w-6 h-6" />
            <span className="font-semibold">Check de Recursos Humanos</span>
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
                            🏢 Modo Kiosco (Marcar Asistencia)
                        </button>
                    </div>
                </div>
            </div>
            <BrandingFooter />
        </div>
    );
};

// ==================== MODAL ADJUNTO ====================

const AdjuntoModal = ({ onClose, onSave, empleadoNombre }) => {
    const [tipo, setTipo] = useState('justificativo');
    const [comentario, setComentario] = useState('');
    const [archivo, setArchivo] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar tamaño (máximo 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('El archivo es demasiado grande. Máximo 2MB');
                return;
            }

            // Validar tipo
            if (!file.type.startsWith('image/')) {
                alert('Solo se permiten imágenes');
                return;
            }

            setArchivo(file);

            // Crear preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!archivo) {
            alert('Por favor selecciona un archivo');
            return;
        }

        if (!comentario.trim()) {
            alert('Por favor ingresa un comentario');
            return;
        }

        setLoading(true);
        await onSave(preview, tipo, comentario);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">Adjuntar Justificativo</h3>
                <p className="text-sm text-gray-600 mb-4">Empleado: <span className="font-semibold">{empleadoNombre}</span></p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2">Tipo de documento</label>
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        >
                            <option value="justificativo">Justificativo de Ausencia</option>
                            <option value="certificado">Certificado Médico</option>
                            <option value="permiso">Permiso Especial</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Comentario</label>
                        <textarea
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                            rows="3"
                            placeholder="Describe el motivo..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Archivo (imagen, máx 2MB)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        />
                    </div>

                    {preview && (
                        <div className="border-2 border-gray-300 rounded-lg p-2">
                            <p className="text-xs text-gray-600 mb-2">Vista previa:</p>
                            <img src={preview} alt="Preview" className="w-full rounded" />
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 bg-[#38BDF8] text-white py-2 rounded-lg font-semibold hover:bg-[#0EA5E9] transition-all disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================== MODAL ADJUNTAR DESDE DASHBOARD ====================

const AdjuntarDesdeDashboardModal = ({ ausencia, onClose, onSave }) => {
    const [tipo, setTipo] = useState('justificativo');
    const [comentario, setComentario] = useState('');
    const [archivo, setArchivo] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('El archivo es demasiado grande. Máximo 2MB');
                return;
            }

            if (!file.type.startsWith('image/')) {
                alert('Solo se permiten imágenes');
                return;
            }

            setArchivo(file);

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!archivo) {
            alert('Por favor selecciona un archivo');
            return;
        }

        if (!comentario.trim()) {
            alert('Por favor ingresa un comentario');
            return;
        }

        setLoading(true);
        await onSave(ausencia, preview, tipo, comentario);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">Adjuntar Justificativo</h3>
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <p className="text-sm"><span className="font-semibold">Empleado:</span> {ausencia.empleadoNombre}</p>
                    <p className="text-sm"><span className="font-semibold">Fecha:</span> {ausencia.fecha}</p>
                    <p className="text-sm"><span className="font-semibold">Departamento:</span> {ausencia.departamento}</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2">Tipo de documento</label>
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        >
                            <option value="justificativo">Justificativo de Ausencia</option>
                            <option value="certificado">Certificado Médico</option>
                            <option value="permiso">Permiso Especial</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Comentario</label>
                        <textarea
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                            rows="3"
                            placeholder="Describe el motivo..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Archivo (imagen, máx 2MB)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        />
                    </div>

                    {preview && (
                        <div className="border-2 border-gray-300 rounded-lg p-2">
                            <p className="text-xs text-gray-600 mb-2">Vista previa:</p>
                            <img src={preview} alt="Preview" className="w-full rounded" />
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 bg-[#38BDF8] text-white py-2 rounded-lg font-semibold hover:bg-[#0EA5E9] transition-all disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================== MODAL DETALLE LISTADO ====================

const DetalleListadoModal = ({ titulo, datos, tipo, onClose, onAdjuntar }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{titulo}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {datos.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No hay registros</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Empleado</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Departamento</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                                    {tipo === 'ausencias' && (
                                        <>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Justificativo</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Acción</th>
                                        </>
                                    )}
                                    {tipo === 'tardanzas' && (
                                        <>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Hora</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Justificativo</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {datos.map((item, idx) => (
                                    <tr key={idx} className="border-t hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-semibold">{item.empleadoNombre}</td>
                                        <td className="px-4 py-3 text-sm">{item.departamento}</td>
                                        <td className="px-4 py-3 text-sm">{item.fecha}</td>
                                        {tipo === 'ausencias' && (
                                            <>
                                                <td className="px-4 py-3 text-center">
                                                    {item.tieneJustificativo ? (
                                                        <span className="text-green-600 font-semibold">✅ Sí</span>
                                                    ) : (
                                                        <span className="text-red-600 font-semibold">❌ No</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {!item.tieneJustificativo && (
                                                        <button
                                                            onClick={() => onAdjuntar(item)}
                                                            className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-blue-600"
                                                        >
                                                            📎 Adjuntar
                                                        </button>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                        {tipo === 'tardanzas' && (
                                            <>
                                                <td className="px-4 py-3 text-sm font-bold">{item.hora}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {item.tieneJustificativo ? (
                                                        <span className="text-green-600 font-semibold">✅ Sí</span>
                                                    ) : (
                                                        <span className="text-red-600 font-semibold">❌ No</span>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-6">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================== KIOSCO SCREEN (MEJORADO CON QR FUNCIONAL) ====================

const KioskoScreen = ({ onBack }) => {
    const [scanning, setScanning] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [marcacionActual, setMarcacionActual] = useState(null);
    const [showAdjuntoModal, setShowAdjuntoModal] = useState(false);
    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);

    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current) {
                html5QrCodeRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const startScanning = async () => {
        setScanning(true);
        setMessage('');
        setMessageType('');

        // Esperar a que el DOM se actualice
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // Verificar que el elemento existe
            const readerElement = document.getElementById("reader");
            if (!readerElement) {
                throw new Error("Elemento reader no encontrado");
            }

            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode("reader");
            }

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await html5QrCodeRef.current.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanError
            );
        } catch (err) {
            console.error("Error iniciando escáner:", err);
            setMessage('❌ No se pudo iniciar la cámara. Verifica los permisos.');
            setMessageType('error');
            setScanning(false);
        }
    };

    const stopScanning = async () => {
        try {
            if (html5QrCodeRef.current) {
                await html5QrCodeRef.current.stop();
            }
        } catch (err) {
            console.error("Error deteniendo escáner:", err);
        }
        setScanning(false);
    };

    const onScanSuccess = async (decodedText) => {
        console.log("QR detectado:", decodedText);
        
        // Detener el escáner inmediatamente
        await stopScanning();
        
        // Procesar la marcación
        await procesarMarcacion(decodedText);
    };

    const onScanError = (error) => {
        // Ignorar errores de escaneo continuo
        if (!error.includes("NotFoundException")) {
            console.log("Error de escaneo:", error);
        }
    };

    const procesarMarcacion = async (qrCode) => {
        try {
            // Buscar usuario por QR
            const usuariosSnapshot = await FirebaseDB.usuarios()
                .where('qrCode', '==', qrCode)
                .limit(1)
                .get();

            if (usuariosSnapshot.empty) {
                setMessage('❌ QR no reconocido. Verifica el código.');
                setMessageType('error');
                return;
            }

            const usuarioDoc = usuariosSnapshot.docs[0];
            const usuario = { id: usuarioDoc.id, ...usuarioDoc.data() };

            // Obtener fecha y hora actual
            const ahora = new Date();
            const fecha = ahora.toLocaleDateString('es-PY');
            const hora = ahora.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

            // Determinar tipo de marcación
            const marcacionesHoy = await FirebaseDB.marcaciones()
                .where('usuarioId', '==', usuario.id)
                .where('fecha', '==', fecha)
                .get();

            let tipo = 'entrada';
            const tiposRegistrados = marcacionesHoy.docs.map(doc => doc.data().tipo);

            if (!tiposRegistrados.includes('entrada')) {
                tipo = 'entrada';
            } else if (!tiposRegistrados.includes('salida_almuerzo')) {
                tipo = 'salida_almuerzo';
            } else if (!tiposRegistrados.includes('entrada_almuerzo')) {
                tipo = 'entrada_almuerzo';
            } else {
                tipo = 'salida';
            }

            // Determinar estado (tarde o normal)
            let estado = 'normal';
            const [horaActual, minutoActual] = hora.split(':').map(Number);
            const horaActualMinutos = horaActual * 60 + minutoActual;

            if (tipo === 'entrada' && usuario.horarioEntrada) {
                const [horaEntrada, minutoEntrada] = usuario.horarioEntrada.split(':').map(Number);
                const horarioMinutos = horaEntrada * 60 + minutoEntrada;
                if (horaActualMinutos > horarioMinutos + 10) {
                    estado = 'tarde';
                }
            }

            // Guardar marcación
            const marcacionRef = await FirebaseDB.marcaciones().add({
                usuarioId: usuario.id,
                usuarioNombre: usuario.nombre,
                usuarioLegajo: usuario.legajo,
                empresaId: usuario.empresaId,
                fecha: fecha,
                hora: hora,
                tipo: tipo,
                estado: estado,
                timestamp: ahora
            });

            const tipoTexto = {
                'entrada': 'Entrada',
                'salida_almuerzo': 'Salida Almuerzo',
                'entrada_almuerzo': 'Entrada Almuerzo',
                'salida': 'Salida'
            };

            setMessage(`✅ ${tipoTexto[tipo]} registrada\n${usuario.nombre}\n${hora}`);
            setMessageType('success');

            // Si llegó tarde o es ausencia, ofrecer adjuntar justificativo
            if (estado === 'tarde') {
                setMarcacionActual({
                    id: marcacionRef.id,
                    usuarioId: usuario.id,
                    usuarioNombre: usuario.nombre
                });
                // Mostrar opción para adjuntar
                setTimeout(() => {
                    if (window.confirm('Llegaste tarde. ¿Deseas adjuntar un justificativo?')) {
                        setShowAdjuntoModal(true);
                    }
                }, 1500);
            }

        } catch (error) {
            console.error('Error procesando marcación:', error);
            setMessage('❌ Error al procesar. Intenta nuevamente.');
            setMessageType('error');
        }
    };

    const handleSaveAdjunto = async (archivo, tipo, comentario) => {
        try {
            await FirebaseDB.saveAdjunto(
                marcacionActual.id,
                marcacionActual.usuarioId,
                archivo,
                tipo,
                comentario
            );
            setShowAdjuntoModal(false);
            alert('✅ Justificativo guardado correctamente');
        } catch (error) {
            console.error('Error guardando adjunto:', error);
            alert('❌ Error al guardar el justificativo');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#7DD3FC] to-[#38BDF8] flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
                    <div className="text-center mb-6">
                        <Logo className="w-16 h-16 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold text-gray-800">🏢 Modo Kiosco</h1>
                        <p className="text-gray-600 mt-2">Escanea tu QR para marcar asistencia</p>
                    </div>

                    {!scanning ? (
                        <div className="text-center space-y-4">
                            <button
                                onClick={startScanning}
                                className="w-full bg-[#38BDF8] text-white py-4 rounded-xl text-xl font-bold hover:bg-[#0EA5E9] transition-all"
                            >
                                📷 Iniciar Escáner QR
                            </button>
                            <button
                                onClick={onBack}
                                className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                            >
                                ← Volver al Login
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div id="reader" className="rounded-xl overflow-hidden border-2 border-gray-300"></div>
                            <button
                                onClick={stopScanning}
                                className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-all"
                            >
                                ⏸️ Detener Escáner
                            </button>
                        </div>
                    )}

                    {message && (
                        <div className={`mt-4 p-4 rounded-xl text-center font-semibold ${
                            messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                            <pre className="whitespace-pre-wrap font-semibold">{message}</pre>
                        </div>
                    )}
                </div>
            </div>

            {showAdjuntoModal && marcacionActual && (
                <AdjuntoModal
                    onClose={() => setShowAdjuntoModal(false)}
                    onSave={handleSaveAdjunto}
                    empleadoNombre={marcacionActual.usuarioNombre}
                />
            )}

            <BrandingFooter />
        </div>
    );
};

// ==================== MODAL EDITAR EMPLEADO ====================

const EditEmpleadoModal = ({ empleado, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        nombre: empleado.nombre || '',
        email: empleado.email || '',
        legajo: empleado.legajo || '',
        departamento: empleado.departamento || '',
        horarioEntrada: empleado.horarioEntrada || '08:00',
        horarioSalida: empleado.horarioSalida || '17:00',
        horarioAlmuerzoSalida: empleado.horarioAlmuerzoSalida || '12:00',
        horarioAlmuerzoEntrada: empleado.horarioAlmuerzoEntrada || '13:00'
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(empleado.id, formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md my-8">
                <h3 className="text-xl font-bold mb-4">✏️ Editar Empleado</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Nombre Completo</label>
                        <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Legajo</label>
                        <input
                            type="text"
                            name="legajo"
                            value={formData.legajo}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Departamento</label>
                        <input
                            type="text"
                            name="departamento"
                            value={formData.departamento}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Hora Entrada</label>
                            <input
                                type="time"
                                name="horarioEntrada"
                                value={formData.horarioEntrada}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Hora Salida</label>
                            <input
                                type="time"
                                name="horarioSalida"
                                value={formData.horarioSalida}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Salida Almuerzo</label>
                            <input
                                type="time"
                                name="horarioAlmuerzoSalida"
                                value={formData.horarioAlmuerzoSalida}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Entrada Almuerzo</label>
                            <input
                                type="time"
                                name="horarioAlmuerzoEntrada"
                                value={formData.horarioAlmuerzoEntrada}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-[#38BDF8] text-white py-2 rounded-lg font-semibold hover:bg-[#0EA5E9] transition-all"
                        >
                            💾 Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==================== MODAL AGREGAR EMPLEADO ====================

const AddEmpleadoModal = ({ onClose, onSave, empresaId }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        legajo: '',
        departamento: '',
        horarioEntrada: '08:00',
        horarioSalida: '17:00',
        horarioAlmuerzoSalida: '12:00',
        horarioAlmuerzoEntrada: '13:00'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md my-8">
                <h3 className="text-xl font-bold mb-4">➕ Agregar Empleado</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="text"
                        placeholder="Nombre Completo"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Legajo"
                        value={formData.legajo}
                        onChange={(e) => setFormData({...formData, legajo: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Departamento"
                        value={formData.departamento}
                        onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        required
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold mb-1">Entrada</label>
                            <input
                                type="time"
                                value={formData.horarioEntrada}
                                onChange={(e) => setFormData({...formData, horarioEntrada: e.target.value})}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1">Salida</label>
                            <input
                                type="time"
                                value={formData.horarioSalida}
                                onChange={(e) => setFormData({...formData, horarioSalida: e.target.value})}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold mb-1">Salida Almuerzo</label>
                            <input
                                type="time"
                                value={formData.horarioAlmuerzoSalida}
                                onChange={(e) => setFormData({...formData, horarioAlmuerzoSalida: e.target.value})}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1">Entrada Almuerzo</label>
                            <input
                                type="time"
                                value={formData.horarioAlmuerzoEntrada}
                                onChange={(e) => setFormData({...formData, horarioAlmuerzoEntrada: e.target.value})}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-[#38BDF8] text-white py-2 rounded-lg font-semibold hover:bg-[#0EA5E9] transition-all"
                        >
                            Agregar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==================== MODAL AGREGAR EMPRESA (CON ADMIN) ====================

const AddEmpresaModal = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        ruc: '',
        direccion: '',
        adminNombre: '',
        adminEmail: '',
        adminPassword: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md my-8">
                <h3 className="text-xl font-bold mb-4">🏢 Agregar Nueva Empresa</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="border-b pb-3">
                        <p className="font-semibold text-gray-700 mb-3">Datos de la Empresa</p>
                        <input
                            type="text"
                            placeholder="Nombre de la Empresa"
                            value={formData.nombre}
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none mb-2"
                            required
                        />
                        <input
                            type="text"
                            placeholder="RUC"
                            value={formData.ruc}
                            onChange={(e) => setFormData({...formData, ruc: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none mb-2"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Dirección"
                            value={formData.direccion}
                            onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                            required
                        />
                    </div>

                    <div>
                        <p className="font-semibold text-gray-700 mb-3">Administrador de la Empresa</p>
                        <input
                            type="text"
                            placeholder="Nombre del Administrador"
                            value={formData.adminNombre}
                            onChange={(e) => setFormData({...formData, adminNombre: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none mb-2"
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email del Administrador"
                            value={formData.adminEmail}
                            onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none mb-2"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Contraseña del Administrador"
                            value={formData.adminPassword}
                            onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                            required
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-[#38BDF8] text-white py-2 rounded-lg font-semibold hover:bg-[#0EA5E9] transition-all"
                        >
                            Crear Empresa
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==================== PANEL ADMIN ====================

const AdminPanel = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('dashboard'); // Cambiar default a dashboard
    const [empleados, setEmpleados] = useState([]);
    const [marcaciones, setMarcaciones] = useState([]);
    const [adjuntos, setAdjuntos] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState(user.empresaId);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddEmpresaModal, setShowAddEmpresaModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(null);
    const [showEditModal, setShowEditModal] = useState(null);
    const [filterFecha, setFilterFecha] = useState('');
    const [filterFechaInicio, setFilterFechaInicio] = useState('');
    const [filterFechaFin, setFilterFechaFin] = useState('');
    const [filterEmpleado, setFilterEmpleado] = useState('');
    const [filterTipo, setFilterTipo] = useState('');
    const [showDetalleModal, setShowDetalleModal] = useState(null);
    const [showAdjuntarModal, setShowAdjuntarModal] = useState(null);
    const [filterJustificativoEmpleado, setFilterJustificativoEmpleado] = useState('');
    const [filterJustificativoFecha, setFilterJustificativoFecha] = useState('');
    const [showConfirmDeleteEmpresa, setShowConfirmDeleteEmpresa] = useState(null);

    useEffect(() => {
        if (user.rol === 'superadmin') {
            loadEmpresas();
        }
        if (selectedEmpresa) {
            loadEmpleados();
            loadMarcaciones();
            loadAdjuntos();
        }
    }, [selectedEmpresa]);

    const loadEmpresas = async () => {
        const snapshot = await FirebaseDB.empresas().get();
        const empresasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEmpresas(empresasData);
        if (!selectedEmpresa && empresasData.length > 0) {
            setSelectedEmpresa(empresasData[0].id);
        }
    };

    const loadEmpleados = async () => {
        try {
            const snapshot = await FirebaseDB.usuarios()
                .where('empresaId', '==', selectedEmpresa)
                .where('rol', '==', 'empleado')
                .get();
            const empleadosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEmpleados(empleadosData);
            console.log('✅ Empleados cargados:', empleadosData.length);
        } catch (error) {
            console.error('Error cargando empleados:', error);
            setEmpleados([]);
        }
    };

    const loadMarcaciones = async () => {
        try {
            const snapshot = await FirebaseDB.marcaciones()
                .where('empresaId', '==', selectedEmpresa)
                .get();
            
            let marcacionesData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            
            // Ordenar en el cliente por timestamp
            marcacionesData.sort((a, b) => {
                const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
                const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
                return timeB - timeA; // Descendente (más reciente primero)
            });
            
            // Limitar a 100 registros
            marcacionesData = marcacionesData.slice(0, 100);
            
            setMarcaciones(marcacionesData);
            console.log('✅ Marcaciones cargadas:', marcacionesData.length);
        } catch (error) {
            console.error('Error cargando marcaciones:', error);
            setMarcaciones([]);
        }
    };

    const loadAdjuntos = async () => {
        try {
            const adjuntosData = await FirebaseDB.getAllAdjuntos(selectedEmpresa);
            setAdjuntos(adjuntosData);
            console.log('✅ Adjuntos cargados:', adjuntosData.length);
        } catch (error) {
            console.error('Error cargando adjuntos:', error);
            setAdjuntos([]);
        }
    };

    const addEmpleado = async (data) => {
        const qrCode = `EMP-${data.legajo}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        await FirebaseDB.usuarios().add({
            ...data,
            empresaId: selectedEmpresa,
            rol: 'empleado',
            qrCode: qrCode,
            createdAt: new Date()
        });
        setShowAddModal(false);
        loadEmpleados();
        alert('✅ Empleado agregado correctamente');
    };

    const updateEmpleado = async (id, data) => {
        const success = await FirebaseDB.updateUsuario(id, data);
        if (success) {
            setShowEditModal(null);
            loadEmpleados();
            alert('✅ Empleado actualizado correctamente');
        } else {
            alert('❌ Error al actualizar empleado');
        }
    };

    const deleteEmpleado = async (id, nombre) => {
        if (window.confirm(`¿Estás seguro de eliminar a ${nombre}? Esta acción no se puede deshacer.`)) {
            const success = await FirebaseDB.deleteUsuario(id);
            if (success) {
                loadEmpleados();
                alert('✅ Empleado eliminado correctamente');
            } else {
                alert('❌ Error al eliminar empleado');
            }
        }
    };

    const addEmpresa = async (data) => {
        try {
            // Crear empresa
            const empresaRef = await FirebaseDB.empresas().add({
                nombre: data.nombre,
                ruc: data.ruc,
                direccion: data.direccion,
                createdAt: new Date()
            });

            // Crear usuario administrador
            await FirebaseDB.usuarios().add({
                empresaId: empresaRef.id,
                legajo: 'ADMIN-' + empresaRef.id.substr(0, 6).toUpperCase(),
                nombre: data.adminNombre,
                email: data.adminEmail,
                password: data.adminPassword,
                departamento: 'Administración',
                rol: 'admin',
                horarioEntrada: '08:00',
                horarioSalida: '17:00',
                horarioAlmuerzoSalida: '12:00',
                horarioAlmuerzoEntrada: '13:00',
                createdAt: new Date()
            });

            setShowAddEmpresaModal(false);
            loadEmpresas();
            alert('✅ Empresa y administrador creados correctamente');
        } catch (error) {
            console.error('Error creando empresa:', error);
            alert('❌ Error al crear la empresa');
        }
    };

    const deleteEmpresa = async (empresaId, empresaNombre) => {
        // Primera confirmación
        const confirm1 = window.confirm(
            `⚠️ ADVERTENCIA ⚠️\n\n` +
            `Estás a punto de eliminar la empresa "${empresaNombre}".\n\n` +
            `Esto eliminará PERMANENTEMENTE:\n` +
            `• La empresa\n` +
            `• Todos los empleados y administradores\n` +
            `• Todas las marcaciones\n` +
            `• Todos los justificativos adjuntados\n\n` +
            `Esta acción NO se puede deshacer.\n\n` +
            `¿Deseas continuar?`
        );

        if (!confirm1) return;

        // Segunda confirmación
        const confirm2 = window.confirm(
            `⚠️ ÚLTIMA CONFIRMACIÓN ⚠️\n\n` +
            `Por favor confirma nuevamente que deseas eliminar "${empresaNombre}" y todos sus datos.\n\n` +
            `Escribe OK en tu mente y presiona Aceptar para proceder.`
        );

        if (!confirm2) return;

        try {
            const success = await FirebaseDB.deleteEmpresa(empresaId);
            
            if (success) {
                // Si la empresa eliminada era la seleccionada, limpiar selección
                if (selectedEmpresa === empresaId) {
                    setSelectedEmpresa(null);
                    setEmpleados([]);
                    setMarcaciones([]);
                    setAdjuntos([]);
                }
                
                await loadEmpresas();
                alert('✅ Empresa eliminada correctamente');
            } else {
                alert('❌ Error al eliminar la empresa');
            }
        } catch (error) {
            console.error('Error en deleteEmpresa:', error);
            alert('❌ Error al eliminar la empresa');
        }
    };

    const showQR = (empleado) => {
        setShowQRModal(empleado);
        setTimeout(() => {
            const qrContainer = document.getElementById('qr-code-display');
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, {
                text: empleado.qrCode,
                width: 200,
                height: 200
            });
        }, 100);
    };

    const downloadQR = () => {
        const canvas = document.querySelector('#qr-code-display canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `QR-${showQRModal.legajo}.png`;
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    const downloadReport = () => {
        let marcacionesFiltradas = marcaciones;

        // Aplicar filtros
        if (filterFechaInicio && filterFechaFin) {
            marcacionesFiltradas = marcacionesFiltradas.filter(m => {
                return m.fecha >= filterFechaInicio && m.fecha <= filterFechaFin;
            });
        } else if (filterFecha) {
            marcacionesFiltradas = marcacionesFiltradas.filter(m => m.fecha === filterFecha);
        }

        if (filterTipo) {
            marcacionesFiltradas = marcacionesFiltradas.filter(m => m.tipo === filterTipo);
        }

        if (filterEmpleado) {
            marcacionesFiltradas = marcacionesFiltradas.filter(m => 
                m.usuarioNombre.toLowerCase().includes(filterEmpleado.toLowerCase())
            );
        }

        let csv = 'Fecha,Empleado,Legajo,Tipo,Hora,Estado\n';
        marcacionesFiltradas.forEach(m => {
            csv += `${m.fecha},${m.usuarioNombre},${m.usuarioLegajo},${m.tipo},${m.hora},${m.estado}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${new Date().toLocaleDateString()}.csv`;
        a.click();
    };

    // Calcular estadísticas del dashboard
    const calcularAusencias = () => {
        const hoy = new Date().toLocaleDateString('es-PY');
        const ausentes = [];
        
        empleados.forEach(emp => {
            // Buscar si tiene marcación de entrada hoy
            const tieneEntradaHoy = marcaciones.some(m => 
                m.usuarioId === emp.id && 
                m.fecha === hoy && 
                m.tipo === 'entrada'
            );
            
            if (!tieneEntradaHoy) {
                // Buscar si tiene justificativo
                const tieneJustificativo = adjuntos.some(adj => 
                    adj.usuarioId === emp.id && 
                    adj.fecha === hoy
                );
                
                ausentes.push({
                    empleadoId: emp.id,
                    empleadoNombre: emp.nombre,
                    departamento: emp.departamento,
                    fecha: hoy,
                    tieneJustificativo: tieneJustificativo
                });
            }
        });
        
        return ausentes;
    };

    const calcularTardanzas = () => {
        return marcaciones.filter(m => 
            m.tipo === 'entrada' && 
            m.estado === 'tarde'
        ).map(m => {
            const tieneJustificativo = adjuntos.some(adj => adj.marcacionId === m.id);
            return {
                ...m,
                empleadoNombre: m.usuarioNombre,
                departamento: m.usuarioDepartamento || 'N/A',
                tieneJustificativo: tieneJustificativo
            };
        });
    };

    const handleAdjuntarJustificativo = async (ausencia, archivo, tipo, comentario) => {
        try {
            // Determinar el marcacionId
            let marcacionId = ausencia.marcacionId;
            
            // Si ya tiene marcacionId (viene desde pestaña Justificativos), usarlo directamente
            if (!marcacionId) {
                // Crear registro de ausencia (viene desde dashboard)
                const marcacionRef = await FirebaseDB.marcaciones().add({
                    usuarioId: ausencia.empleadoId,
                    usuarioNombre: ausencia.empleadoNombre,
                    empresaId: selectedEmpresa,
                    fecha: ausencia.fecha,
                    tipo: 'ausencia',
                    estado: 'justificado',
                    timestamp: new Date()
                });
                marcacionId = marcacionRef.id;
            }
            
            // Guardar adjunto
            await FirebaseDB.saveAdjunto(marcacionId, ausencia.empleadoId, archivo, tipo, comentario);
            
            // Marcar como justificado
            await FirebaseDB.updateMarcacionWithAdjunto(marcacionId, 'temp');
            
            // Recargar datos
            await loadMarcaciones();
            await loadAdjuntos();
            
            setShowAdjuntarModal(null);
            alert('✅ Justificativo guardado correctamente');
        } catch (error) {
            console.error('Error guardando justificativo:', error);
            alert('❌ Error al guardar el justificativo');
        }
    };

    const marcacionesMostradas = marcaciones.filter(m => {
        // Filtro por rango de fechas
        if (filterFechaInicio && filterFechaFin) {
            if (m.fecha < filterFechaInicio || m.fecha > filterFechaFin) return false;
        } else if (filterFecha) {
            // Mantener compatibilidad con filtro de fecha única
            if (m.fecha !== filterFecha) return false;
        }
        
        // Filtro por tipo
        if (filterTipo && m.tipo !== filterTipo) return false;
        
        // Filtro por nombre de empleado
        if (filterEmpleado && !m.usuarioNombre.toLowerCase().includes(filterEmpleado.toLowerCase())) {
            return false;
        }
        
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-[#38BDF8] to-[#0EA5E9] text-white p-4 shadow-lg">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <Logo className="w-10 h-10" />
                        <div>
                            <h1 className="text-xl font-bold">Panel de Administración</h1>
                            <p className="text-sm opacity-90">{user.nombre}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="bg-white text-[#38BDF8] px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all">
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4">
                {user.rol === 'superadmin' && (
                    <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
                        <div className="flex gap-3 items-center">
                            <select
                                value={selectedEmpresa || ''}
                                onChange={(e) => setSelectedEmpresa(e.target.value)}
                                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                            >
                                <option value="">Seleccionar Empresa</option>
                                {empresas.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                                ))}
                            </select>
                            {selectedEmpresa && (
                                <button
                                    onClick={() => {
                                        const empresa = empresas.find(e => e.id === selectedEmpresa);
                                        if (empresa) {
                                            deleteEmpresa(selectedEmpresa, empresa.nombre);
                                        }
                                    }}
                                    className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-all"
                                >
                                    🗑️ Eliminar
                                </button>
                            )}
                            <button
                                onClick={() => setShowAddEmpresaModal(true)}
                                className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-all"
                            >
                                ➕ Nueva Empresa
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-lg mb-4">
                    <div className="flex border-b overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`flex-1 py-3 font-semibold transition-all whitespace-nowrap ${
                                activeTab === 'dashboard' ? 'bg-[#38BDF8] text-white' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            📊 Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('empleados')}
                            className={`flex-1 py-3 font-semibold transition-all whitespace-nowrap ${
                                activeTab === 'empleados' ? 'bg-[#38BDF8] text-white' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            👥 Empleados
                        </button>
                        <button
                            onClick={() => setActiveTab('marcaciones')}
                            className={`flex-1 py-3 font-semibold transition-all whitespace-nowrap ${
                                activeTab === 'marcaciones' ? 'bg-[#38BDF8] text-white' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            📋 Marcaciones
                        </button>
                        <button
                            onClick={() => setActiveTab('justificativos')}
                            className={`flex-1 py-3 font-semibold transition-all whitespace-nowrap ${
                                activeTab === 'justificativos' ? 'bg-[#38BDF8] text-white' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            📁 Justificativos
                        </button>
                    </div>
                </div>

                {activeTab === 'dashboard' && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {/* Indicador: Total Empleados */}
                            <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-all">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm font-semibold">Total Empleados</p>
                                        <p className="text-3xl font-bold text-[#38BDF8] mt-2">{empleados.length}</p>
                                    </div>
                                    <div className="bg-blue-100 p-4 rounded-full">
                                        <span className="text-3xl">👥</span>
                                    </div>
                                </div>
                            </div>

                            {/* Indicador: Ausencias (clickeable) */}
                            <div 
                                className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-all cursor-pointer"
                                onClick={() => {
                                    const ausentes = calcularAusencias();
                                    setShowDetalleModal({
                                        titulo: 'Ausencias del Día',
                                        datos: ausentes,
                                        tipo: 'ausencias'
                                    });
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm font-semibold">Ausencias Hoy</p>
                                        <p className="text-3xl font-bold text-orange-500 mt-2">{calcularAusencias().length}</p>
                                        <p className="text-xs text-gray-500 mt-1">Click para ver detalle</p>
                                    </div>
                                    <div className="bg-orange-100 p-4 rounded-full">
                                        <span className="text-3xl">⚠️</span>
                                    </div>
                                </div>
                            </div>

                            {/* Indicador: Llegadas Tarde (clickeable) */}
                            <div 
                                className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-all cursor-pointer"
                                onClick={() => {
                                    const tardanzas = calcularTardanzas();
                                    setShowDetalleModal({
                                        titulo: 'Llegadas Tardías',
                                        datos: tardanzas,
                                        tipo: 'tardanzas'
                                    });
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm font-semibold">Llegadas Tarde</p>
                                        <p className="text-3xl font-bold text-red-500 mt-2">{calcularTardanzas().length}</p>
                                        <p className="text-xs text-gray-500 mt-1">Click para ver detalle</p>
                                    </div>
                                    <div className="bg-red-100 p-4 rounded-full">
                                        <span className="text-3xl">🕐</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow p-6">
                            <h3 className="text-lg font-bold mb-4">📈 Resumen General</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border-l-4 border-green-500 pl-4">
                                    <p className="text-sm text-gray-600">Marcaciones Totales</p>
                                    <p className="text-2xl font-bold text-gray-800">{marcaciones.length}</p>
                                </div>
                                <div className="border-l-4 border-purple-500 pl-4">
                                    <p className="text-sm text-gray-600">Justificativos Adjuntados</p>
                                    <p className="text-2xl font-bold text-gray-800">{adjuntos.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'empleados' && (
                    <div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="w-full bg-[#38BDF8] text-white py-3 rounded-xl font-bold mb-4 hover:bg-[#0EA5E9] transition-all"
                        >
                            ➕ Agregar Empleado
                        </button>

                        <div className="bg-white rounded-xl shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Legajo</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Nombre</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Departamento</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {empleados.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                                    No hay empleados registrados
                                                </td>
                                            </tr>
                                        ) : (
                                            empleados.map((emp) => (
                                                <tr key={emp.id} className="border-t hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm font-bold">{emp.legajo}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold">{emp.nombre}</td>
                                                    <td className="px-4 py-3 text-sm">{emp.departamento}</td>
                                                    <td className="px-4 py-3 text-sm">{emp.email}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <div className="flex gap-2 justify-center">
                                                            <button
                                                                onClick={() => showQR(emp)}
                                                                className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-blue-600"
                                                            >
                                                                📱 QR
                                                            </button>
                                                            <button
                                                                onClick={() => setShowEditModal(emp)}
                                                                className="bg-yellow-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-yellow-600"
                                                            >
                                                                ✏️ Editar
                                                            </button>
                                                            <button
                                                                onClick={() => deleteEmpleado(emp.id, emp.nombre)}
                                                                className="bg-red-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-red-600"
                                                            >
                                                                🗑️ Borrar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'marcaciones' && (
                    <div>
                        <div className="bg-white rounded-xl shadow p-4 mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        value={filterFechaInicio}
                                        onChange={(e) => {
                                            setFilterFechaInicio(e.target.value);
                                            setFilterFecha(''); // Limpiar filtro de fecha única
                                        }}
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha Fin</label>
                                    <input
                                        type="date"
                                        value={filterFechaFin}
                                        onChange={(e) => {
                                            setFilterFechaFin(e.target.value);
                                            setFilterFecha(''); // Limpiar filtro de fecha única
                                        }}
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Empleado</label>
                                    <input
                                        type="text"
                                        value={filterEmpleado}
                                        onChange={(e) => setFilterEmpleado(e.target.value)}
                                        placeholder="Buscar por nombre..."
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                    />
                                </div>
                                <select
                                    value={filterTipo}
                                    onChange={(e) => setFilterTipo(e.target.value)}
                                    className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                >
                                    <option value="">Todos los tipos</option>
                                    <option value="entrada">Entrada</option>
                                    <option value="salida">Salida</option>
                                    <option value="salida_almuerzo">Salida Almuerzo</option>
                                    <option value="entrada_almuerzo">Entrada Almuerzo</option>
                                </select>
                            </div>
                            <button
                                onClick={() => { 
                                    setFilterFecha(''); 
                                    setFilterFechaInicio(''); 
                                    setFilterFechaFin(''); 
                                    setFilterEmpleado(''); 
                                    setFilterTipo(''); 
                                }}
                                className="w-full mt-3 bg-gray-200 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                            >
                                Limpiar filtros
                            </button>
                        </div>

                        <button 
                            onClick={downloadReport} 
                            className="w-full bg-[#38BDF8] text-white py-3 rounded-xl font-bold mb-4 hover:bg-[#0EA5E9] transition-all"
                        >
                            📥 Descargar Reporte CSV
                        </button>

                        <div className="bg-white rounded-xl shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Empleado</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Hora</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {marcacionesMostradas.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                                    No hay marcaciones
                                                </td>
                                            </tr>
                                        ) : (
                                            marcacionesMostradas.slice(0, 30).map((m, idx) => (
                                                <tr key={m.id || idx} className="border-t hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm">{m.fecha}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold">{m.usuarioNombre}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                            m.tipo === 'entrada' ? 'bg-green-100 text-green-700' :
                                                            m.tipo === 'salida' ? 'bg-red-100 text-red-700' :
                                                            m.tipo === 'salida_almuerzo' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {m.tipo.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-bold">{m.hora}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {m.estado === 'tarde' && <span className="text-orange-600 font-semibold">⚠️ Tarde</span>}
                                                        {m.estado === 'normal' && <span className="text-green-600">✓</span>}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'justificativos' && (
                    <div>
                        {/* Header con filtros */}
                        <div className="bg-white rounded-xl shadow p-6 mb-4">
                            <h3 className="text-lg font-bold mb-4">📁 Todos los Justificativos</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Total de adjuntos: <span className="font-bold">{adjuntos.length}</span>
                            </p>

                            {/* Filtros */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar Empleado</label>
                                    <input
                                        type="text"
                                        value={filterJustificativoEmpleado}
                                        onChange={(e) => setFilterJustificativoEmpleado(e.target.value)}
                                        placeholder="Buscar por nombre..."
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Filtrar por Fecha</label>
                                    <input
                                        type="date"
                                        value={filterJustificativoFecha}
                                        onChange={(e) => setFilterJustificativoFecha(e.target.value)}
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                    />
                                </div>
                            </div>

                            {(filterJustificativoEmpleado || filterJustificativoFecha) && (
                                <button
                                    onClick={() => {
                                        setFilterJustificativoEmpleado('');
                                        setFilterJustificativoFecha('');
                                    }}
                                    className="w-full mt-3 bg-gray-200 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>

                        {/* Tabla de justificativos */}
                        {(() => {
                            // Obtener todas las marcaciones con información enriquecida
                            const marcacionesConInfo = marcaciones.map(m => {
                                const empleado = empleados.find(emp => emp.id === m.usuarioId);
                                const tieneJustificativo = adjuntos.some(adj => adj.marcacionId === m.id);
                                const adjunto = adjuntos.find(adj => adj.marcacionId === m.id);
                                
                                return {
                                    ...m,
                                    departamento: empleado?.departamento || 'N/A',
                                    tieneJustificativo: tieneJustificativo,
                                    adjunto: adjunto,
                                    tipoMarcacion: m.tipo === 'entrada' && m.estado === 'tarde' ? 'Llegada Tardía' : 
                                                  m.tipo === 'ausencia' ? 'Ausencia' : 'Otro'
                                };
                            });

                            // Filtrar marcaciones
                            const marcacionesFiltradas = marcacionesConInfo.filter(m => {
                                // Solo mostrar entradas tardías y ausencias
                                if (m.tipo !== 'ausencia' && !(m.tipo === 'entrada' && m.estado === 'tarde')) {
                                    return false;
                                }

                                // Filtrar por empleado
                                if (filterJustificativoEmpleado && 
                                    !m.usuarioNombre.toLowerCase().includes(filterJustificativoEmpleado.toLowerCase())) {
                                    return false;
                                }

                                // Filtrar por fecha
                                if (filterJustificativoFecha && m.fecha !== filterJustificativoFecha) {
                                    return false;
                                }

                                return true;
                            });

                            if (marcacionesFiltradas.length === 0) {
                                return (
                                    <div className="bg-white rounded-xl shadow p-8 text-center">
                                        <p className="text-gray-500">
                                            {filterJustificativoEmpleado || filterJustificativoFecha 
                                                ? 'No hay registros que coincidan con los filtros' 
                                                : 'No hay ausencias ni llegadas tardías registradas'}
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <div className="bg-white rounded-xl shadow overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Empleado</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Departamento</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Estado</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {marcacionesFiltradas.map((m, idx) => (
                                                    <tr key={m.id || idx} className="border-t hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-sm font-semibold">{m.usuarioNombre}</td>
                                                        <td className="px-4 py-3 text-sm">{m.departamento}</td>
                                                        <td className="px-4 py-3 text-sm">{m.fecha}</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                                m.tipoMarcacion === 'Llegada Tardía' ? 'bg-orange-100 text-orange-700' :
                                                                m.tipoMarcacion === 'Ausencia' ? 'bg-red-100 text-red-700' :
                                                                'bg-gray-100 text-gray-700'
                                                            }`}>
                                                                {m.tipoMarcacion}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {m.tieneJustificativo ? (
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className="text-green-600 font-semibold">✅ Con justificativo</span>
                                                                    {m.adjunto && (
                                                                        <button
                                                                            onClick={() => {
                                                                                const win = window.open();
                                                                                win.document.write(`
                                                                                    <html>
                                                                                        <head><title>Justificativo - ${m.usuarioNombre}</title></head>
                                                                                        <body style="margin:0; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:100vh; background:#f3f4f6; padding:20px;">
                                                                                            <div style="background:white; padding:20px; border-radius:8px; margin-bottom:20px; max-width:800px;">
                                                                                                <h3 style="margin:0 0 10px 0;">Comentario:</h3>
                                                                                                <p style="margin:0;">${m.adjunto.comentario || 'Sin comentario'}</p>
                                                                                                <p style="margin:10px 0 0 0; font-size:12px; color:#666;">Tipo: ${m.adjunto.tipo}</p>
                                                                                            </div>
                                                                                            <img src="${m.adjunto.archivo}" style="max-width:100%; max-height:70vh; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1);" />
                                                                                        </body>
                                                                                    </html>
                                                                                `);
                                                                            }}
                                                                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                                                                        >
                                                                            Ver detalles
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-red-600 font-semibold">❌ Sin justificativo</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {!m.tieneJustificativo && (
                                                                <button
                                                                    onClick={() => {
                                                                        setShowAdjuntarModal({
                                                                            marcacionId: m.id,
                                                                            empleadoId: m.usuarioId,
                                                                            empleadoNombre: m.usuarioNombre,
                                                                            departamento: m.departamento,
                                                                            fecha: m.fecha,
                                                                            tipo: m.tipoMarcacion
                                                                        });
                                                                    }}
                                                                    className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-blue-600"
                                                                >
                                                                    📎 Adjuntar
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {showAddModal && (
                <AddEmpleadoModal 
                    onClose={() => setShowAddModal(false)} 
                    onSave={addEmpleado}
                    empresaId={selectedEmpresa}
                />
            )}

            {showAddEmpresaModal && (
                <AddEmpresaModal
                    onClose={() => setShowAddEmpresaModal(false)}
                    onSave={addEmpresa}
                />
            )}

            {showEditModal && (
                <EditEmpleadoModal
                    empleado={showEditModal}
                    onClose={() => setShowEditModal(null)}
                    onSave={updateEmpleado}
                />
            )}

            {showDetalleModal && (
                <DetalleListadoModal
                    titulo={showDetalleModal.titulo}
                    datos={showDetalleModal.datos}
                    tipo={showDetalleModal.tipo}
                    onClose={() => setShowDetalleModal(null)}
                    onAdjuntar={(ausencia) => {
                        setShowAdjuntarModal(ausencia);
                        setShowDetalleModal(null);
                    }}
                />
            )}

            {showAdjuntarModal && (
                <AdjuntarDesdeDashboardModal
                    ausencia={showAdjuntarModal}
                    onClose={() => setShowAdjuntarModal(null)}
                    onSave={handleAdjuntarJustificativo}
                />
            )}

            {showQRModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4 text-center">Código QR - Gafete</h3>
                        <div className="bg-gray-50 p-4 rounded-xl mb-4">
                            <p className="font-bold text-lg text-center">{showQRModal.nombre}</p>
                            <p className="text-sm text-gray-600 text-center">Legajo: {showQRModal.legajo}</p>
                            <p className="text-xs text-gray-500 text-center mt-1">{showQRModal.departamento}</p>
                        </div>
                        <div id="qr-code-display" className="flex justify-center mb-4 bg-white p-4 rounded-xl"></div>
                        <p className="text-xs text-center text-gray-500 mb-4 font-mono">{showQRModal.qrCode}</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowQRModal(null)} 
                                className="flex-1 bg-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                            >
                                Cerrar
                            </button>
                            <button 
                                onClick={downloadQR} 
                                className="flex-1 bg-[#38BDF8] text-white py-2 rounded-lg font-semibold hover:bg-[#0EA5E9] transition-all"
                            >
                                📥 Descargar
                            </button>
                        </div>
                        <p className="text-xs text-center text-gray-500 mt-3">
                            💡 Imprime este QR y pégalo en el gafete del empleado
                        </p>
                    </div>
                </div>
            )}

            <BrandingFooter />
        </div>
    );
};

// ==================== APP PRINCIPAL ====================

const App = () => {
    const [mode, setMode] = useState('login');
    const [currentUser, setCurrentUser] = useState(null);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        FirebaseDB.initializeData().then(() => {
            setInitialized(true);
        });
    }, []);

    const handleLogin = (user) => {
        setCurrentUser(user);
        if (user.rol === 'admin' || user.rol === 'superadmin') {
            setMode('admin');
        } else {
            alert('Esta versión es solo para administradores. Usa el Modo Kiosco para marcar asistencia.');
            setMode('login');
        }
    };

    const handleKiosko = () => {
        setMode('kiosko');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setMode('login');
    };

    const handleBackFromKiosko = () => {
        setMode('login');
    };

    if (!initialized) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#7DD3FC] to-[#38BDF8] flex items-center justify-center">
                <div className="text-center text-white">
                    <Logo className="w-20 h-20 mx-auto mb-4 animate-pulse" />
                    <p className="text-xl font-semibold">Inicializando...</p>
                </div>
            </div>
        );
    }

    if (mode === 'login') {
        return <LoginScreen onLogin={handleLogin} onKiosko={handleKiosko} />;
    }

    if (mode === 'kiosko') {
        return <KioskoScreen onBack={handleBackFromKiosko} />;
    }

    if (mode === 'admin' && currentUser) {
        return <AdminPanel user={currentUser} onLogout={handleLogout} />;
    }

    return <LoginScreen onLogin={handleLogin} onKiosko={handleKiosko} />;
};

// ==================== RENDERIZAR ====================

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
