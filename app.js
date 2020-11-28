const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const dbConnection = require('./database');
const { body, validationResult } = require('express-validator');
const { timeLog } = require('console');

const app = express();
app.use(express.urlencoded({extended: false}));

//set our views and view engines
app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({extended: false}))

//apply cookie session middleware
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge: 1800 * 1000 //30 minutes
}))

//declaring custom middleware
const ifNotLoggedin = (req, res, next) => {
    if(!req.session.isLoggedIn){
        return res.render('login');
    }
    next()
}

const ifLoggedIn = (req, res, next) =>{
    if(req.session.isLoggedIn){
        return res.redirect('/')
    }
    next()
}



app.get('/',(req, res)=>{
       res.render('index')
})

app.get('/register',(req, res)=>{
    res.render('register.ejs')
})

app.post('/register', ifLoggedIn,
[
    body('email','firstname cannot be empty').isEmail().custom((value)=>{
        return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`=?', [value])
        .then(([rows])=>{
            if(rows.length > 0){
                return Promise.reject('This E-mail already in use!')
            }
            return true;
        });
    }),
    body('firstname', 'Firstname is empty').trim().not().isEmpty(),
    body('lastname', 'lastname is empty').trim().not().isEmpty(),
    body('password', 'the password must be a minimum length of 6 characters').trim().isLength({min: 6}),
    body('DOB', 'MustBeAValid Date').trim().notEmpty().isDate(),
],
(req, res, next)=>{
    const validation_result = validationResult(req);
    const {email, firstname, lastname, password, DOB} = req.body;

    if(validation_result.isEmpty()){
        //password encryption (using bcrypt)
        bcrypt.hash(password, 12).then((hash_pass)=>{
            //inserting user into database
            dbConnection.execute("INSERT INTO `users`(`email`, `firstname`, `lastname`, `password`, `register_date`) VALUES (?,?,?,?,?)", [email, firstname, lastname, hash_pass, DOB])
            .then(result =>{
                res.redirect('/login')
                //res.send(`your account has been created successfully, you can <a href='/'>Login</a>`);
            }).catch(err =>{
                if(err) throw err;
            })

        })
        .catch(err =>{
            //throw hash err
            if (err) throw err;
        })
    }
    else {
        //collect all the validation errors
        let allErrors = validation_result.errors.map((error)=>{
            return error.msg;
        });
        //rendering login- register page with validtion
        res.render('login',{
            register_error:allErrors,
            old_data:req.body
        })
    }
});


app.get('/login',ifLoggedIn, (req, res)=>{
    res.render('login.ejs')
})

app.post('/login', ifLoggedIn,[
    body('email').custom((value)=>{
        return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`=?', [value])
        .then(([rows])=>{
            if(rows.length == 1){
                return true;
            }
            return Promise.reject('Invalid Email Address!');
        })
    }),
    body('password', 'password is empty!').trim().not().isEmpty(),
 //   body('firstname', 'Firstname is empty').trim().not().isEmpty(),
], (req, res)=>{
    const validation_result = validationResult(req);
    const {password, email} = req.body;
    if(validation_result.isEmpty()){

        dbConnection.execute("SELECT * FROM `users` WHERE `email`=?", [email])
        .then(([rows])=>{
            bcrypt.compare(password, rows[0].password).then(compare_result =>{
                if(compare_result === true){
                    req.session.isLoggedIn = true;
                    req.session.userID = rows[0].id;

                    res.redirect('/', 301)
                }
                else{
                    res.render('login',{
                        login_errors: ['invalid password!']
                    });
                }
            })
            .catch(err =>{
                if(err) throw err;
            });

        }).catch(err =>{
            if(err) throw err;
        })
    }
    else {
        let allErrors = validation_result.errors.map((error)=>{
            return error.msg;
        });
        res.render('login',{
            login_errors:allErrors
        });
    }
});






const PORT = process.env.PORT || 4000;

app.listen(PORT, ()=>{
    console.log(`server started on port: ${PORT}`)
})




/*
if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

const express = require('express');
const path = require('path');
const bcrypt  = require('bcrypt');
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')

//express app
const app = express();

const initializePassport = require('./passport-config');

initializePassport(
    passport, 
    email => users.find(user=> user.email === email),
    id => users.find(user=> user.id === id)
)






const users = [];

//register view engine
app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({extended: false}))

app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))



app.get('/', checkAuthenticated, (req, res)=>{
    res.render('index.ejs', {name : req.user.firstname})
    console.log(req.user.firstname)
})

app.get('/login', checkNotAuthenticated, (req, res)=>{
    res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local',{
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

app.get('/register', checkNotAuthenticated,(req, res)=>{
    res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req, res)=>{
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        users.push({
            id: Date.now().toString(),
            email: req.body.email,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            dob: req.body.DOB,
            password: hashedPassword
        })
        res.redirect('/login')
    } catch {
        res.redirect('/register')

    }
    console.log(users)
})

app.delete('/logout', (req, res)=>{
    req.logOut()
    res.redirect('/login')
})


function checkAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next){
    if(req.isAuthenticated()){
      return res.redirect('/')
    }
    next()
}



const PORT = process.env.PORT || 4000;

app.listen(PORT, ()=>{
    console.log(`server started on port: ${PORT}`)
})
*/