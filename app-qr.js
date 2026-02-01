const { useState, useEffect, useRef } = React;

// ==================== UTILIDADES ====================

const Storage = {
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error leyendo localStorage:', error);
            return null;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
            return false;
        }
    }
};

const initializeData = () => {
    if (!Storage.get('empresas')) {
        Storage.set('empresas', [
            {
                id: 'emp1',
                nombre: 'Empresa Demo S.A.',
                ruc: '80012345-6',
                direccion: 'Asunción, Paraguay'
            }
        ]);
    }

    if (!Storage.get('usuarios')) {
        Storage.set('usuarios', [
            {
                id: '1',
                empresaId: 'emp1',
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
                qrCode: 'EMP-1001-ABC123'
            },
            {
                id: 'admin1',
                empresaId: 'emp1',
                legajo: 'ADMIN',
                nombre: 'Admin Empresa Demo',
                email: 'admin@empresa.com',
                password: 'admin123',
                departamento: 'RRHH',
                rol: 'admin',
                horarioEntrada: '08:00',
                horarioSalida: '17:00',
                horarioAlmuerzoSalida: '12:00',
                horarioAlmuerzoEntrada: '13:00'
            },
            {
                id: 'superadmin',
                empresaId: null, // Super admin no pertenece a empresa específica
                legajo: 'SUPER',
                nombre: 'Super Administrador',
                email: 'super@checkrrhh.com',
                password: 'super123',
                departamento: 'Check de RRHH',
                rol: 'superadmin',
                horarioEntrada: '08:00',
                horarioSalida: '17:00'
            }
        ]);
    }
    if (!Storage.get('marcaciones')) {
        Storage.set('marcaciones', []);
    }
};

// ==================== COMPONENTES ====================

// Logo SVG
const Logo = ({ className = "w-12 h-12" }) => (
    <svg viewBox="0 0 100 100" className={className}>
        <circle cx="50" cy="50" r="45" fill="#38BDF8"/>
        <path d="M35 50 L45 60 L65 40" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

// Footer con branding
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

    const handleLogin = (e) => {
        e.preventDefault();
        const usuarios = Storage.get('usuarios') || [];
        const usuario = usuarios.find(u => u.email === email && u.password === password);
        
        if (usuario) {
            onLogin(usuario);
        } else {
            setError('Credenciales incorrectas');
        }
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
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#38BDF8] focus:outline-none"
                            placeholder="Contraseña"
                            required
                        />
                        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                        <button type="submit" className="w-full bg-gradient-to-r from-[#38BDF8] to-[#0EA5E9] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all">
                            Ingresar
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

// ==================== PANTALLA KIOSCO ====================

const KioskoScreen = ({ onBack }) => {
    const [scanning, setScanning] = useState(false);
    const [lastScan, setLastScan] = useState(null);
    const [message, setMessage] = useState('');
    const [empresaActual, setEmpresaActual] = useState(null);
    const scannerRef = useRef(null);

    useEffect(() => {
        // Cargar empresa por defecto (la primera)
        const empresas = Storage.get('empresas') || [];
        if (empresas.length > 0) {
            setEmpresaActual(empresas[0]);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    const startScanner = () => {
        setScanning(true);
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            (decodedText) => {
                processQRCode(decodedText);
            },
            () => {}
        ).catch(err => {
            console.error('Error iniciando scanner:', err);
            setMessage('❌ Error al acceder a la cámara');
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

    const processQRCode = (qrData) => {
        const usuarios = Storage.get('usuarios') || [];
        const empleado = usuarios.find(u => u.qrCode === qrData);

        if (!empleado) {
            setMessage('❌ QR no válido');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const marcaciones = Storage.get('marcaciones') || [];
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const hora = now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

        const marcacionesHoy = marcaciones.filter(m => m.usuarioId === empleado.id && m.fecha === today);
        
        // Determinar tipo de marcación
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
        if (tipo === 'entrada' && hora > empleado.horarioEntrada) {
            estado = 'tarde';
        }

        const newMarcacion = {
            id: Date.now().toString(),
            usuarioId: empleado.id,
            empresaId: empleado.empresaId,
            empresaNombre: empresaActual?.nombre || 'Sin empresa',
            usuarioNombre: empleado.nombre,
            legajo: empleado.legajo,
            tipo,
            hora,
            fecha: today,
            estado
        };

        marcaciones.push(newMarcacion);
        Storage.set('marcaciones', marcaciones);

        const tipoTexto = tipo === 'entrada' ? 'ENTRADA' :
                         tipo === 'salida_almuerzo' ? 'SALIDA ALMUERZO' :
                         tipo === 'entrada_almuerzo' ? 'ENTRADA ALMUERZO' :
                         'SALIDA';

        setLastScan({
            nombre: empleado.nombre,
            tipo: tipoTexto,
            hora,
            estado
        });

        setMessage(`✅ ${tipoTexto} registrada: ${empleado.nombre}`);
        
        setTimeout(() => {
            setMessage('');
            setLastScan(null);
        }, 5000);
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
                            <p className="mt-4 text-orange-600 font-bold text-lg">⚠️ Llegada Tarde</p>
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
                    <p className="text-sm mt-2">El sistema detectará automáticamente el tipo de marcación</p>
                </div>
            </div>
            <BrandingFooter />
        </div>
    );
};

// ==================== MODAL AGREGAR EMPLEADO ====================

const AddEmpleadoModal = ({ onClose, onSave, empresaId }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '1234',
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">Agregar Nuevo Empleado</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="text"
                        placeholder="Nombre completo *"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        className="w-full px-4 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email *"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Contraseña (default: 1234)"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-4 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                    />
                    <input
                        type="text"
                        placeholder="Legajo *"
                        value={formData.legajo}
                        onChange={(e) => setFormData({...formData, legajo: e.target.value})}
                        className="w-full px-4 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Departamento *"
                        value={formData.departamento}
                        onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                        className="w-full px-4 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        required
                    />
                    
                    <div className="border-t pt-3 mt-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Horarios</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Entrada</label>
                                <input
                                    type="time"
                                    value={formData.horarioEntrada}
                                    onChange={(e) => setFormData({...formData, horarioEntrada: e.target.value})}
                                    className="w-full px-3 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Salida</label>
                                <input
                                    type="time"
                                    value={formData.horarioSalida}
                                    onChange={(e) => setFormData({...formData, horarioSalida: e.target.value})}
                                    className="w-full px-3 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Salida Almuerzo</label>
                                <input
                                    type="time"
                                    value={formData.horarioAlmuerzoSalida}
                                    onChange={(e) => setFormData({...formData, horarioAlmuerzoSalida: e.target.value})}
                                    className="w-full px-3 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Entrada Almuerzo</label>
                                <input
                                    type="time"
                                    value={formData.horarioAlmuerzoEntrada}
                                    onChange={(e) => setFormData({...formData, horarioAlmuerzoEntrada: e.target.value})}
                                    className="w-full px-3 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg font-semibold">
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 bg-[#38BDF8] text-white py-2 rounded-lg font-semibold">
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==================== MODAL AGREGAR EMPRESA ====================

const AddEmpresaModal = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        ruc: '',
        direccion: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                <h3 className="text-xl font-bold mb-4">Agregar Nueva Empresa</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="text"
                        placeholder="Nombre de la empresa *"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        className="w-full px-4 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        required
                    />
                    <input
                        type="text"
                        placeholder="RUC *"
                        value={formData.ruc}
                        onChange={(e) => setFormData({...formData, ruc: e.target.value})}
                        className="w-full px-4 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Dirección"
                        value={formData.direccion}
                        onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                        className="w-full px-4 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                    />
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded-lg font-semibold">
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 bg-[#38BDF8] text-white py-2 rounded-lg font-semibold">
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ==================== PANTALLA ADMIN ====================

const AdminPanel = ({ user, onLogout }) => {
    const [view, setView] = useState('dashboard');
    const [usuarios, setUsuarios] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [marcaciones, setMarcaciones] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddEmpresaModal, setShowAddEmpresaModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(null);
    const [selectedEmpresa, setSelectedEmpresa] = useState(null);
    
    // Filtros
    const [filtroEmpleado, setFiltroEmpleado] = useState('');
    const [filtroFecha, setFiltroFecha] = useState('');

    useEffect(() => {
        loadData();
    }, [view]);

    const loadData = () => {
        const allUsuarios = Storage.get('usuarios') || [];
        const allEmpresas = Storage.get('empresas') || [];
        const allMarcaciones = Storage.get('marcaciones') || [];
        
        setEmpresas(allEmpresas);
        
        if (user.rol === 'superadmin') {
            setUsuarios(allUsuarios);
            setMarcaciones(allMarcaciones);
            if (!selectedEmpresa && allEmpresas.length > 0) {
                setSelectedEmpresa(allEmpresas[0].id);
            }
        } else {
            // Admin regular solo ve su empresa
            setUsuarios(allUsuarios.filter(u => u.empresaId === user.empresaId));
            setMarcaciones(allMarcaciones.filter(m => m.empresaId === user.empresaId));
            setSelectedEmpresa(user.empresaId);
        }
    };

    const generateQRCode = (empleado) => {
        setShowQRModal(empleado);
        setTimeout(() => {
            const qrDiv = document.getElementById('qr-code-display');
            if (qrDiv) {
                qrDiv.innerHTML = '';
                new QRCode(qrDiv, {
                    text: empleado.qrCode,
                    width: 256,
                    height: 256,
                    colorDark: "#38BDF8",
                    colorLight: "#ffffff"
                });
            }
        }, 100);
    };

    const downloadQR = () => {
        const canvas = document.querySelector('#qr-code-display canvas');
        if (canvas) {
            const url = canvas.toDataURL();
            const a = document.createElement('a');
            a.href = url;
            a.download = `QR-${showQRModal.nombre.replace(/\s/g, '-')}.png`;
            a.click();
        }
    };

    const addEmpleado = (formData) => {
        const newUser = {
            ...formData,
            id: Date.now().toString(),
            empresaId: selectedEmpresa,
            rol: 'empleado',
            qrCode: `EMP-${formData.legajo}-${Date.now().toString().slice(-6)}`
        };
        const allUsuarios = Storage.get('usuarios') || [];
        const updatedUsers = [...allUsuarios, newUser];
        Storage.set('usuarios', updatedUsers);
        loadData();
        setShowAddModal(false);
        alert('✅ Empleado agregado correctamente. Genera su QR desde la lista.');
    };

    const addEmpresa = (formData) => {
        const newEmpresa = {
            ...formData,
            id: Date.now().toString()
        };
        const allEmpresas = Storage.get('empresas') || [];
        const updatedEmpresas = [...allEmpresas, newEmpresa];
        Storage.set('empresas', updatedEmpresas);
        loadData();
        setShowAddEmpresaModal(false);
        alert('✅ Empresa agregada correctamente.');
    };

    const downloadReport = () => {
        const empresaObj = empresas.find(e => e.id === selectedEmpresa);
        const empresaNombre = empresaObj ? empresaObj.nombre : 'Todas';
        
        let marcacionesFiltradas = marcaciones;
        
        // Aplicar filtros
        if (selectedEmpresa && user.rol === 'superadmin') {
            marcacionesFiltradas = marcacionesFiltradas.filter(m => m.empresaId === selectedEmpresa);
        }
        if (filtroEmpleado) {
            marcacionesFiltradas = marcacionesFiltradas.filter(m => 
                m.usuarioNombre.toLowerCase().includes(filtroEmpleado.toLowerCase()) ||
                m.legajo.toLowerCase().includes(filtroEmpleado.toLowerCase())
            );
        }
        if (filtroFecha) {
            marcacionesFiltradas = marcacionesFiltradas.filter(m => m.fecha === filtroFecha);
        }

        const csv = [['Empresa', 'Fecha', 'Empleado', 'Legajo', 'Tipo', 'Hora', 'Estado']];
        marcacionesFiltradas.forEach(m => {
            csv.push([
                m.empresaNombre || empresaNombre,
                m.fecha, 
                m.usuarioNombre, 
                m.legajo, 
                m.tipo.replace('_', ' '), 
                m.hora, 
                m.estado
            ]);
        });
        const csvContent = csv.map(row => row.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${empresaNombre}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const empleadosFiltrados = selectedEmpresa 
        ? usuarios.filter(u => u.empresaId === selectedEmpresa && u.rol === 'empleado')
        : usuarios.filter(u => u.rol === 'empleado');

    const today = new Date().toISOString().split('T')[0];
    const marcacionesHoy = selectedEmpresa
        ? marcaciones.filter(m => m.fecha === today && m.empresaId === selectedEmpresa)
        : marcaciones.filter(m => m.fecha === today);

    // Aplicar filtros a marcaciones mostradas
    let marcacionesMostradas = marcaciones;
    if (selectedEmpresa && user.rol === 'superadmin') {
        marcacionesMostradas = marcacionesMostradas.filter(m => m.empresaId === selectedEmpresa);
    }
    if (filtroEmpleado) {
        marcacionesMostradas = marcacionesMostradas.filter(m => 
            m.usuarioNombre.toLowerCase().includes(filtroEmpleado.toLowerCase()) ||
            m.legajo.toLowerCase().includes(filtroEmpleado.toLowerCase())
        );
    }
    if (filtroFecha) {
        marcacionesMostradas = marcacionesMostradas.filter(m => m.fecha === filtroFecha);
    }

    const empresaActual = empresas.find(e => e.id === selectedEmpresa);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <div className="bg-gradient-to-r from-[#38BDF8] to-[#0EA5E9] text-white p-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Logo className="w-10 h-10" />
                        <div>
                            <h1 className="text-xl font-bold">
                                {user.rol === 'superadmin' ? 'Super Admin' : 'Panel Administrativo'}
                            </h1>
                            <p className="text-sm opacity-90">{user.nombre}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="bg-white text-[#38BDF8] px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-all">
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto p-4 w-full">
                {/* Selector de Empresa (solo para superadmin) */}
                {user.rol === 'superadmin' && empresas.length > 0 && (
                    <div className="mb-4 bg-white p-4 rounded-xl shadow">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Empresa:</label>
                        <div className="flex gap-3">
                            <select
                                value={selectedEmpresa || ''}
                                onChange={(e) => setSelectedEmpresa(e.target.value)}
                                className="flex-1 px-4 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                            >
                                {empresas.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.nombre} - {emp.ruc}
                                    </option>
                                ))}
                            </select>
                            <button 
                                onClick={() => setShowAddEmpresaModal(true)}
                                className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600"
                            >
                                + Nueva Empresa
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <button 
                        onClick={() => setView('dashboard')} 
                        className={`p-4 rounded-xl font-semibold transition-all ${
                            view === 'dashboard' ? 'bg-[#38BDF8] text-white shadow-lg' : 'bg-white hover:bg-gray-50'
                        }`}
                    >
                        📊 Dashboard
                    </button>
                    <button 
                        onClick={() => setView('empleados')} 
                        className={`p-4 rounded-xl font-semibold transition-all ${
                            view === 'empleados' ? 'bg-[#38BDF8] text-white shadow-lg' : 'bg-white hover:bg-gray-50'
                        }`}
                    >
                        👥 Empleados
                    </button>
                    <button 
                        onClick={() => setView('marcaciones')} 
                        className={`p-4 rounded-xl font-semibold transition-all ${
                            view === 'marcaciones' ? 'bg-[#38BDF8] text-white shadow-lg' : 'bg-white hover:bg-gray-50'
                        }`}
                    >
                        📋 Marcaciones
                    </button>
                </div>

                {/* Vista Dashboard */}
                {view === 'dashboard' && (
                    <div className="space-y-4">
                        {empresaActual && (
                            <div className="bg-white p-4 rounded-xl shadow">
                                <h3 className="font-bold text-lg text-gray-800">{empresaActual.nombre}</h3>
                                <p className="text-sm text-gray-600">RUC: {empresaActual.ruc}</p>
                                {empresaActual.direccion && (
                                    <p className="text-sm text-gray-600">{empresaActual.direccion}</p>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-xl shadow text-center">
                                <p className="text-4xl font-bold text-green-600">{empleadosFiltrados.length}</p>
                                <p className="text-gray-600 mt-2">Empleados</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow text-center">
                                <p className="text-4xl font-bold text-blue-600">
                                    {marcacionesHoy.filter(m => m.tipo === 'entrada').length}
                                </p>
                                <p className="text-gray-600 mt-2">Presentes Hoy</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow text-center">
                                <p className="text-4xl font-bold text-orange-600">
                                    {marcacionesHoy.filter(m => m.estado === 'tarde').length}
                                </p>
                                <p className="text-gray-600 mt-2">Llegadas Tarde</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow">
                            <h3 className="text-xl font-bold mb-4">Últimas Marcaciones</h3>
                            {marcacionesHoy.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No hay marcaciones hoy</p>
                            ) : (
                                <div className="space-y-3">
                                    {marcacionesHoy.slice(-5).reverse().map(m => (
                                        <div key={m.id} className="flex justify-between items-center py-3 border-b last:border-0">
                                            <div>
                                                <p className="font-semibold">{m.usuarioNombre}</p>
                                                <p className="text-sm text-gray-500">
                                                    Legajo: {m.legajo} | {m.tipo.replace('_', ' ')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-[#38BDF8] text-lg">{m.hora}</p>
                                                {m.estado === 'tarde' && (
                                                    <span className="text-xs text-orange-600 font-semibold">⚠️ Tarde</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Vista Empleados */}
                {view === 'empleados' && (
                    <div>
                        <button 
                            onClick={() => setShowAddModal(true)} 
                            className="w-full bg-green-500 text-white py-3 rounded-xl font-bold mb-4 hover:bg-green-600 transition-all"
                            disabled={!selectedEmpresa}
                        >
                            + Agregar Nuevo Empleado
                        </button>

                        <div className="grid gap-4">
                            {empleadosFiltrados.map(emp => (
                                <div key={emp.id} className="bg-white p-4 rounded-xl shadow flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-lg">{emp.nombre}</p>
                                        <p className="text-sm text-gray-600">Legajo: {emp.legajo} | {emp.departamento}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Horario: {emp.horarioEntrada} - {emp.horarioSalida}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Almuerzo: {emp.horarioAlmuerzoSalida} - {emp.horarioAlmuerzoEntrada}
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1 font-mono">QR: {emp.qrCode}</p>
                                    </div>
                                    <button 
                                        onClick={() => generateQRCode(emp)} 
                                        className="bg-[#38BDF8] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#0EA5E9] transition-all"
                                    >
                                        Ver QR
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Vista Marcaciones */}
                {view === 'marcaciones' && (
                    <div>
                        <div className="bg-white p-4 rounded-xl shadow mb-4">
                            <h3 className="font-bold text-gray-800 mb-3">Filtros</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Buscar empleado (nombre o legajo)</label>
                                    <input
                                        type="text"
                                        value={filtroEmpleado}
                                        onChange={(e) => setFiltroEmpleado(e.target.value)}
                                        placeholder="Ej: Juan Pérez"
                                        className="w-full px-3 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={filtroFecha}
                                        onChange={(e) => setFiltroFecha(e.target.value)}
                                        className="w-full px-3 py-2 border-2 rounded-lg focus:border-[#38BDF8] focus:outline-none"
                                    />
                                </div>
                            </div>
                            {(filtroEmpleado || filtroFecha) && (
                                <button
                                    onClick={() => {
                                        setFiltroEmpleado('');
                                        setFiltroFecha('');
                                    }}
                                    className="mt-3 text-sm text-[#38BDF8] hover:underline"
                                >
                                    Limpiar filtros
                                </button>
                            )}
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
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Legajo</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Hora</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {marcacionesMostradas.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                                    No hay marcaciones {filtroEmpleado || filtroFecha ? 'que coincidan con los filtros' : 'registradas'}
                                                </td>
                                            </tr>
                                        ) : (
                                            marcacionesMostradas.slice(-30).reverse().map(m => (
                                                <tr key={m.id} className="border-t hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm">{m.fecha}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold">{m.usuarioNombre}</td>
                                                    <td className="px-4 py-3 text-sm">{m.legajo}</td>
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
            </div>

            {/* Modales */}
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

    useEffect(() => {
        initializeData();
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
