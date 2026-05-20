import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseTwilioInbound, verifyTwilioSignature } from "../twilio";

describe("parseTwilioInbound", () => {
  it("strips the 'whatsapp:' prefix and lifts core fields", () => {
    const msg = parseTwilioInbound({
      From: "whatsapp:+34611555010",
      To: "whatsapp:+34911000000",
      Body: "Hola",
      ProfileName: "Lucía",
      MessageSid: "SMabc",
    });
    expect(msg).toEqual({
      toAddress: "+34911000000",
      fromAddress: "+34611555010",
      fromName: "Lucía",
      text: "Hola",
      providerMessageId: "SMabc",
      raw: expect.any(Object),
    });
  });

  it("returns null when required fields are missing", () => {
    expect(parseTwilioInbound({ From: "x" })).toBeNull();
    expect(parseTwilioInbound({})).toBeNull();
  });
});

describe("verifyTwilioSignature", () => {
  const authToken = "test_token_abc";
  const fullUrl = "https://example.com/api/webhooks/whatsapp";
  const params = {
    From: "whatsapp:+34611555010",
    To: "whatsapp:+34911000000",
    Body: "Hola",
  };
  const expected = crypto
    .createHmac("sha1", authToken)
    .update(
      fullUrl +
        Object.keys(params)
          .sort()
          .map((k) => k + (params as Record<string, string>)[k])
          .join(""),
      "utf8",
    )
    .digest("base64");

  it("accepts a correctly signed payload", () => {
    expect(verifyTwilioSignature({ signature: expected, fullUrl, params, authToken })).toBe(true);
  });

  it("rejects a wrong signature", () => {
    expect(
      verifyTwilioSignature({
        signature: "AAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        fullUrl,
        params,
        authToken,
      }),
    ).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyTwilioSignature({ signature: null, fullUrl, params, authToken })).toBe(false);
  });

  it("rejects a tampered param", () => {
    const tampered = { ...params, Body: "tampered" };
    expect(
      verifyTwilioSignature({ signature: expected, fullUrl, params: tampered, authToken }),
    ).toBe(false);
  });
});
