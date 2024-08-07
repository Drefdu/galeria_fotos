const express = require('express');
const router = express.Router();
const Usuario = require('./Models/usuarios');
const Imagen = require('./Models/imagenes');
const multer = require('multer');
const fs = require('fs');
const path = require("path");
const crypto = require('crypto');


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


router.post('/database/registro', upload.single('Foto'), async (req, res) => {
    try {
        const { Nombre, Apellidos, Correo, Telefono, Password, ConfirmarPassword } = req.body;
        let Foto;
        if (req.file) {
           
            Foto = req.file.buffer.toString('base64');
        } else {
            
            const defaultImagePath = path.join(__dirname, '..', 'public', 'assets', 'user_Default.png');
            const defaultImageBuffer = fs.readFileSync(defaultImagePath);
            Foto = defaultImageBuffer.toString('base64');
        }

        
        let regexPass = /^[a-zA-Z0-9!#$%&\/?\\¿¡+*~{[^`},;.:_-]*$/;
        let regexUser = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        let regexCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!regexUser.test(Nombre) || !regexUser.test(Apellidos)) {
            return res.render("formularios/registro", { mensaje: "Nombre o Apellidos contienen caracteres no permitidos" });
        }
        if (!regexCorreo.test(Correo)) {
            return res.render("formularios/registro", { mensaje: "El correo electrónico no es válido" });
        }
        if (Password !== ConfirmarPassword) {
            return res.render("formularios/registro", { mensaje: "Las contraseñas no coinciden" });
        }
        if (!regexPass.test(Password)) {
            return res.render("formularios/registro", { mensaje: "La contraseña contiene caracteres no permitidos" });
        }

      
        let hash = crypto.createHash('sha1');
        let data = hash.update(Password, 'utf-8');
        let gen_hash = data.digest('hex');

       
        const usuario = new Usuario({
            nombre: Nombre,
            apellidos: Apellidos,
            correo: Correo,
            telefono: Telefono,
            password: gen_hash,
            foto: Foto
        });
        const NuevoUsuario = await usuario.save();

        return res.render("formularios/login", { mensaje: "El usuario ha sido creado satisfactoriamente" });
    } catch (error) {
        if (error.code === 11000) { 
            const campoDuplicado = Object.keys(error.keyPattern)[0];
            return res.render("formularios/registro", { mensaje: `El campo ${campoDuplicado} ya está registrado` });
        } else {
            console.error("Error en el servidor:", error);
            return res.render("error", { message: error.message });
        }
    }
});


router.post('/database/login', async (req, res) => {
    try {
        const { Correo, Password } = req.body;
        let regexCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!regexCorreo.test(Correo)) {
            return res.render("formularios/login", { mensaje: "El correo electrónico no es válido" });
        }
        const usuario = await Usuario.findOne({ correo: Correo });
        if (!usuario) {
            return res.render("formularios/login", { mensaje: "Correo electrónico no encontrado" });
        }
        let hash = crypto.createHash('sha1');
        let data = hash.update(Password, 'utf-8');
        let gen_hash = data.digest('hex');
        if (gen_hash !== usuario.password) {
            return res.render("formularios/login", { mensaje: "Contraseña incorrecta" });
        }
        req.session.usuario = usuario;
        req.session.save()
        return res.redirect('/')
    } catch (error) {
        return res.render("error", { message: error.message });
    }
});


router.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});


router.get('/database/imagenes', async (req, res) => {
    try {
        const imagenes = await Imagen.find();
        res.status(200).json(imagenes);
    } catch (error) {
        return res.render("error", { message: error.message });
    }
});


router.get('/database/imagenes/:correo', async (req, res) => {
    const correo = req.params.correo;
    try {
        const imagenes = await Imagen.find({ correo });
        res.status(200).json(imagenes);
    } catch (error) {
        return res.render("error", { message: error.message });
    }
});

//Agregar una nueva imagen
router.post('/upload', upload.single('imagen'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No se subió ninguna imagen');
        }
        // Convertir la imagen a base64
        const base64Image = req.file.buffer.toString('base64');
        // Guardar la imagen en la base de datos o hacer lo que sea necesario
        // Aquí se guarda en la base de datos de ejemplo
        const nuevaImagen = new Imagen({
            nombreImagen: req.file.originalname,
            imagen: base64Image,
            correo: req.session.usuario.correo,
            nombre: req.session.usuario.nombre,
            apellidos: req.session.usuario.apellidos
        });

        await nuevaImagen.save();
        // Responder con éxito
        res.status(201).send('Imagen subida correctamente');
    } catch (error) {
        console.error('Error al subir la imagen:', error);
        res.status(500).send('Error al subir la imagen');
    }
});








module.exports = router;
