import { privateKeyToAccount } from "thirdweb/wallets";
import { verifySignature } from "thirdweb/auth";
import { NextRequest, NextResponse } from "next/server";
import { createThirdwebClient } from "thirdweb";

// Ensure the clientId is provided
const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
if (!clientId) {
  throw new Error("No client ID provided");
}

// Create the Thirdweb client
const client = createThirdwebClient({
  clientId: clientId,
});

// Create the admin account
const adminAccount = privateKeyToAccount({
  privateKey: process.env.ADMIN_SECRET_KEY as string,
  client,
});

// Verify the Telegram signature
export async function verifyTelegram(signature: string, message: string) {
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
    address: adminAccount.address,
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
    const { payload } = await request.json();
    const { signature, message } = JSON.parse(payload);

    // Verify the user via Telegram
    const userId = await verifyTelegram(signature, message);

    if (!userId) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({ userId });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

