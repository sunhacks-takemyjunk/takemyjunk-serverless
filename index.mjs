exports.handler = async (event) => {
    const method = event.httpMethod;

    if(method === 'GET'){
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Hello World' })
        };
    }

    if(method === 'POST'){
        const requestBody = JSON.parse(event.body);
        // Process request body
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Form submitted successfully', data: requestBody })
        };
    }

    if(method === 'PUT'){
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Update successful' })
        };
    }

    if(method === 'DELETE'){
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Delete successful' })
        };
    }

    return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Unsupported method' })
    };
};
