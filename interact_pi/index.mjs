import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: "us-east-1" });

export const handler = async (event) => {
    const params = {
        Message: JSON.stringify({ action: "perform_hardware_action" }), // Customize the message as needed
        TopicArn: "arn:aws:sns:us-east-1:122286528153:pi_tasks" // Replace with your SNS topic ARN
    };

    try {
        const data = await snsClient.send(new PublishCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Message published to SNS", data: data })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error publishing message to SNS", error: error.message })
        };
    }
};