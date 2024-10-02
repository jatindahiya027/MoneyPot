// pages/api/export.js
import { parse } from 'papaparse';

const handler = (req, res) => {
    // Your array of data
    const data = [
        {
            "transid": 10,
            "type": "Debit",
            "category": "Rent",
            "description": "helloworld",
            "date": "2024-08-13",
            "amount": 3200
        },
        {
            "transid": 11,
            "type": "Debit",
            "category": "Shopping",
            "description": "data",
            "date": "2024-08-12",
            "amount": 67
        }
    ];
//console.log("hello world");
    // Convert the array to CSV
    const csv = parse(data, { header: true }).data;

    // Set the response headers to indicate a CSV file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');

    // Send the CSV file content
    res.status(200).send(csv);
};

export default handler;
