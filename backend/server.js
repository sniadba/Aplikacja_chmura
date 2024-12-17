const express = require('express');
const sql = require('mssql');
const bodyParser = require('body-parser');
const cors = require('cors');  // Importuj CORS

const app = express();

// Umożliwienie CORS dla wszystkich domen (możesz dostosować, jeśli chcesz ograniczyć dostęp)
app.use(cors());

app.use(bodyParser.json());

const config = {
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  server: 'db',  // Zmieniamy na nazwę usługi bazy danych z docker-compose.yml
  port: 1433,  // Domyślny port MSSQL
  database: process.env.DATABASE_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};


// Funkcja do autoryzacji użytkownika
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    await sql.connect(config);
    const result = await sql.query`SELECT * FROM Users WHERE Username = ${username}`;
    const user = result.recordset[0];

    if (!user || user.Password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Zwracamy dane użytkownika
    res.json({ message: `${username}` });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Funkcja do pobierania książek
app.get('/books', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT * FROM Books`;
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'An error occurred while fetching books' });
  }
});

// Rejestracja nowego użytkownika
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    await sql.connect(config);
    const userCheck = await sql.query`SELECT * FROM Users WHERE Username = ${username}`;
    if (userCheck.recordset.length > 0) {
      return res.status(400).json({ error: 'Użytkownik o tej nazwie już istnieje' });
    }

    await sql.query`INSERT INTO Users (Username, Password) VALUES (${username}, ${password})`;
    res.status(201).json({ message: 'Rejestracja zakończona sukcesem' });
  } catch (error) {
    console.error('Błąd podczas rejestracji:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas rejestracji' });
  }
});


// Pobieranie listy książek
app.get('/books', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT Title, Author FROM Books`;
    res.json(result.recordset);
  } catch (error) {
    console.error('Błąd podczas pobierania książek:', error);
    res.status(500).json({ error: 'Nie udało się pobrać listy książek' });
  }
});

app.post('/change-password', async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;

  try {
    await sql.connect(config);
    const result = await sql.query`SELECT * FROM Users WHERE Username = ${username}`;
    const user = result.recordset[0];

    if (!user || user.Password !== currentPassword) {
      return res.status(401).json({ error: 'Nieprawidłowe obecne hasło' });
    }

    await sql.query`UPDATE Users SET Password = ${newPassword} WHERE Username = ${username}`;
    res.json({ message: 'Hasło zostało zmienione' });
  } catch (error) {
    console.error('Błąd podczas zmiany hasła:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas zmiany hasła' });
  }
});

// Wyszukiwanie książek po tytule
app.get('/search-books', async (req, res) => {
  const { title } = req.query; // Pobranie parametru `title` z query string
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT Title, Author FROM Books WHERE Title LIKE '%' + ${title} + '%'`;
    res.json(result.recordset);
  } catch (error) {
    console.error('Błąd podczas wyszukiwania książek:', error);
    res.status(500).json({ error: 'Nie udało się wyszukać książek' });
  }
});


// Dodanie książki do przeczytanych
app.post('/add-readed', async (req, res) => {
  const { username, title, author } = req.body;

  try {
    await sql.connect(config);
    // Sprawdzamy, czy książka już jest w tabeli "Readed"
    const checkQuery = await sql.query`SELECT * FROM Readed WHERE Username = ${username} AND Title = ${title}`;
    
    if (checkQuery.recordset.length > 0) {
      return res.status(400).json({ error: 'Książka już została dodana do przeczytanych' });
    }

    // Dodanie książki do tabeli "Readed"
    await sql.query`INSERT INTO Readed (Username, Title, Author) VALUES (${username}, ${title}, ${author})`;

    res.status(201).json({ message: 'Książka została dodana do przeczytanych' });
  } catch (error) {
    console.error('Błąd podczas dodawania książki do przeczytanych:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas dodawania książki' });
  }
});

// Pobieranie przeczytanych książek dla zalogowanego użytkownika
app.get('/readed-books', async (req, res) => {
  const { username } = req.query; // Pobranie parametru `username` z query string

  if (!username) {
    return res.status(400).json({ error: 'Brak nazwy użytkownika' });
  }

  try {
    await sql.connect(config);

    // Pobieranie książek przeczytanych przez użytkownika z tabeli Readed
    const result = await sql.query`SELECT Title, Author FROM Readed WHERE Username = ${username}`;

    if (result.recordset.length === 0) {
      return res.status(200).json([]);  // Jeśli użytkownik nie ma przeczytanych książek
    }

    res.json(result.recordset);  // Zwrócenie wyników w formacie JSON
  } catch (error) {
    console.error('Błąd podczas pobierania przeczytanych książek:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania książek' });
  }
});


// Dodawanie problemu
app.post('/add-problem', async (req, res) => {
  const { username, content } = req.body;

  if (!username || !content) {
    return res.status(400).json({ error: 'Brak wymaganych danych' });
  }

  try {
    await sql.connect(config);
    
    // Dodaj problem do tabeli 'Problems'
    await sql.query`INSERT INTO Problems (Username, Content) VALUES (${username}, ${content})`;

    res.status(200).json({ message: 'Problem został zapisany' });
  } catch (error) {
    console.error('Błąd podczas dodawania problemu:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas zapisywania problemu' });
  }
});

app.get('/user-rank', async (req, res) => {
  const { username } = req.query; // Pobranie parametru `username` z query string
  
  if (!username) {
    return res.status(400).json({ error: 'Brak nazwy użytkownika' });
  }

  try {
    await sql.connect(config); // Połączenie z bazą danych

    // Zapytanie: policz książki przeczytane przez użytkownika
    const bookCountResult = await sql.query`
      SELECT COUNT(*) AS book_count 
      FROM Readed 
      WHERE username = ${username}
    `;

    const bookCount = parseInt(bookCountResult.recordset[0]?.book_count || 0);

    // Zapytanie: pobierz rangę na podstawie liczby przeczytanych książek
    const rankResult = await sql.query`
      SELECT name 
      FROM Ranks 
      WHERE ${bookCount} BETWEEN min_books AND max_books
    `;

    const rank = rankResult.recordset[0]?.name || 'Brak rangi';

    // Zwrócenie wyniku w formacie JSON
    res.status(200).json({ bookCount, rank });
  } catch (error) {
    console.error('Błąd podczas pobierania rangi:', error);
    res.status(500).json({ error: 'Wystąpił błąd serwera' });
  }
});


// Uruchamiamy aplikację
app.listen(5001, () => {
  console.log('Backend server running on port 5001');
});
