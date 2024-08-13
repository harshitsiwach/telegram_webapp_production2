import { privateKeyToAccount } from "thirdweb/wallets";
import { verifySignature } from "thirdweb/auth";
import { NextRequest, NextResponse } from "next/server";
import { createThirdwebClient, ThirdwebClient } from "thirdweb";

// Function to initialize the Thirdweb client and admin account
function initializeClientAndAccount() {
  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
  if (!clientId) {
    throw new Error("No client ID provided");
  }

  const client: ThirdwebClient = createThirdwebClient({
    clientId: clientId,
  });

  const adminAccount = privateKeyToAccount({
    privateKey: process.env.ADMIN_SECRET_KEY as string,
    client,
  });

  return { client, adminAccount };
}

async function verifyTelegram(client: ThirdwebClient, adminAddress: string, signature: string, message: string) {
  const metadata = JSON.parse(message);

  // Check if the message is expired or invalid
  if (!metadata.expiration || metadata.expiration < Date.now()) {
    return false;
  }

  // Ensure the metadata contains a username
  if (!metadata.username) {
    return false;
  }

  // Verify the signature
  const isValid = await verifySignature({
    client,
    address: adminAddress,
    message: message,
    signature,
  });

  if (!isValid) {
    return false;
  }

  // Return the username if valid
  return metadata.username;
}

// Handle POST requests
export async function POST(request: NextRequest) {
  try {
    const { client, adminAccount } = initializeClientAndAccount();

    const { payload } = await request.json();
    const { signature, message } = JSON.parse(payload);

    // Verify the user via Telegram
    const userId = await verifyTelegram(client, adminAccount.address, signature, message);

    if (!userId) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({ userId });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
