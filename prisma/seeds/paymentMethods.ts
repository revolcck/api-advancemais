import { PaymentMethod, PaymentMethodType } from "@prisma/client";
import { SeedContext, prisma } from "./utils";

/**
 * Seed para criar métodos de pagamento
 */
export async function seedPaymentMethods(
  context: SeedContext
): Promise<SeedContext> {
  console.log("Criando métodos de pagamento do Mercado Pago...");

  const paymentMethods = [
    {
      type: PaymentMethodType.CREDIT_CARD,
      name: "Cartão de Crédito",
      description: "Pagamento via cartão de crédito (Visa, Mastercard, etc.)",
      mpPaymentTypeId: "credit_card",
      processingFee: 4.99, // 4.99% de taxa
      requiredFields: {
        cardNumber: true,
        cardholderName: true,
        expirationDate: true,
        securityCode: true,
        identificationNumber: true,
        identificationType: true,
      },
      isActive: true,
    },
    {
      type: PaymentMethodType.DEBIT_CARD,
      name: "Cartão de Débito",
      description: "Pagamento via cartão de débito",
      mpPaymentTypeId: "debit_card",
      processingFee: 3.99, // 3.99% de taxa
      requiredFields: {
        cardNumber: true,
        cardholderName: true,
        expirationDate: true,
        securityCode: true,
        identificationNumber: true,
        identificationType: true,
      },
      isActive: true,
    },
    {
      type: PaymentMethodType.PIX,
      name: "PIX",
      description: "Transferência instantânea via PIX",
      mpPaymentTypeId: "pix",
      processingFee: 1.99, // 1.99% de taxa
      requiredFields: {},
      isActive: true,
    },
    {
      type: PaymentMethodType.BANK_SLIP,
      name: "Boleto Bancário",
      description: "Pagamento via boleto bancário",
      mpPaymentTypeId: "ticket",
      mpPaymentMethodId: "bolbradesco",
      processingFee: 2.99, // 2.99% de taxa
      fixedFee: 3.0, // R$ 3,00 de taxa fixa
      requiredFields: {
        firstName: true,
        lastName: true,
        email: true,
        identificationNumber: true,
        identificationType: true,
      },
      isActive: true,
    },
    {
      type: PaymentMethodType.MP_CHECKOUT,
      name: "Checkout Mercado Pago",
      description: "Checkout completo do Mercado Pago com todos os métodos",
      mpPaymentTypeId: "mp_checkout",
      processingFee: 4.99, // 4.99% de taxa
      isActive: true,
    },
  ];

  // Definindo explicitamente o tipo do array
  const createdMethods: PaymentMethod[] = [];

  for (const method of paymentMethods) {
    const existingMethod = await prisma.paymentMethod.findFirst({
      where: { type: method.type, name: method.name },
    });

    const createdMethod = await prisma.paymentMethod.upsert({
      where: {
        id: existingMethod?.id || "",
      },
      update: method,
      create: method,
    });
    console.log(`Método de pagamento criado: ${createdMethod.name}`);
    createdMethods.push(createdMethod);
  }

  return {
    ...context,
    paymentMethods: createdMethods,
  };
}
