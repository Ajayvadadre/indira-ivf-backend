import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { createActivityLog } from "../logs/log.service.js";

const calcDiscount = (
  price: number,
  quantity: number,
  threshold: number,
  percent: number
): { discountedPrice: number; discountApplied: boolean } => {
  if (threshold > 0 && quantity > threshold && percent > 0) {
    const discountedPrice = Math.round(price * (1 - percent / 100) * 100) / 100;
    return { discountedPrice, discountApplied: true };
  }
  return { discountedPrice: price, discountApplied: false };
};

const formatCart = (cart: any) => {
  if (!cart) return { items: [] };

  return {
    id: cart.id,
    user: cart.userId,
    items: (cart.items || []).map((item: any) => {
      const product = item.product;
      const { discountedPrice, discountApplied } = product
        ? calcDiscount(
            product.price,
            item.quantity,
            product.discountThreshold ?? 0,
            product.discountPercent ?? 0
          )
        : { discountedPrice: 0, discountApplied: false };

      return {
        id: item.id,
        quantity: item.quantity,
        product: product
          ? {
              ...product,
              _id: product.id,
            }
          : null,
        discountedPrice,
        discountApplied,
        discountPercent: product?.discountPercent ?? 0,
        discountThreshold: product?.discountThreshold ?? 0,
        lineTotal: Math.round(discountedPrice * item.quantity * 100) / 100,
      };
    }),
  };
};

export const getCart = async (userId: string) => {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  }

  return formatCart(cart);
};

export const addToCart = async (
  userId: string,
  productId: string,
  quantity: number
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || !product.isActive) {
    throw new ApiError(404, "Product not found");
  }

  if (product.stock < quantity) {
    throw new ApiError(400, "Not enough stock");
  }

  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
        items: {
          create: [{ productId, quantity }],
        },
      },
      include: { items: true },
    });
  } else {
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }
  }

  await createActivityLog({
    user: userId,
    action: "CART_ITEM_ADDED",
    entityType: "Product",
    entityId: productId,
    message: `Added product to cart: ${product.name}`,
  });

  return getCart(userId);
};

export const updateCartItem = async (
  userId: string,
  productId: string,
  quantity: number
) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  const existingItem = cart.items.find((item) => item.productId === productId);

  if (!existingItem) {
    throw new ApiError(404, "Cart item not found");
  }

  await prisma.cartItem.update({
    where: { id: existingItem.id },
    data: { quantity },
  });

  return getCart(userId);
};

export const removeCartItem = async (userId: string, productId: string) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  const existingItem = cart.items.find((item) => item.productId === productId);

  if (existingItem) {
    await prisma.cartItem.delete({
      where: { id: existingItem.id },
    });
  }

  await createActivityLog({
    user: userId,
    action: "CART_ITEM_REMOVED",
    entityType: "Product",
    entityId: productId,
    message: "Removed product from cart",
  });

  return getCart(userId);
};

export const clearCart = async (userId: string) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    return getCart(userId);
  }

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  return getCart(userId);
};
