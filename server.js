require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/hello-world', (req, res) => {
    res.json({ message: 'Hello World! Welcome to my Node.js API' });
});

app.post('/send-email', async (req, res) => {
    const { to, subject, body, attachments } = req.body;

    if (!to || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, or body' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.ionos.de',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const formattedAttachments = attachments?.map((attachment) => ({
            filename: attachment.filename,
            path: attachment.path,
            contentType: 'application/pdf',
        })) || [];

        // Tùy chọn email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text: body,
            attachments: formattedAttachments
        };

        // Gửi email
        await transporter.sendMail(mailOptions);
        res.json({ message: 'Email sent successfully' });

        formattedAttachments.forEach(attachment => {
            fs.rm(attachment.path, { force: true }, (err) => {
                if (err) {
                    console.error('Error deleting file:', err);
                } else {
                    console.log('File deleted successfully:', attachment.path);
                }
            });
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

app.post('/save-pdf', (req, res) => {
    const { filename, pdfData, directoryPath } = req.body;

    if (!filename || !pdfData || !directoryPath) {
        return res.status(400).json({ error: 'Missing required fields: filename, pdfData, or directoryPath' });
    }

    try {
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
        }

        const filePath = path.join(directoryPath, filename);
        const data = pdfData.replace(/^data:application\/pdf;base64,/, '');

        fs.writeFile(filePath, data, 'base64', (error) => {
            if (error) {
                console.error('Error saving PDF:', error.message);
                return res.status(500).json({ error: 'Failed to save PDF' });
            }
            res.json({ message: 'PDF saved successfully' });
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred during file saving' });
    }
});

// ✅ KHỞI ĐỘNG SERVER
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
