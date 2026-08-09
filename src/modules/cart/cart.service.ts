import { ApiError } from "../../utils/ApiError.js";
import { isValidObjectId } from "../../utils/isValidObjectId.js";
import { createActivityLog } from "../logs/log.service.js";
import { ProductModel } from "../products/product.model.js";
import { CartModel } from "./cart.model.js";

export const getCart = async (userId: string) => {
  let cart = await CartModel.findOne({ user: userId }).populate("items.product");

  if (!cart) {
    cart = await CartModel.create({
      user: userId,
      items: [],
    });
  }

  return cart;
};

export const addToCart = async (
  userId: string,
  productId: string,
  quantity: number
) => {
  if (!isValidObjectId(productId)) {
    throw new ApiError(400, "Invalid product id");
  }

  const product = await ProductModel.findById(productId);

  if (!product || !product.isActive) {
    throw new ApiError(404, "Product not found");
  }

  if (product.stock < quantity) {
    throw new ApiError(400, "Not enough stock");
  }

  const cart = await CartModel.findOne({ user: userId });

  if (!cart) {
    await CartModel.create({
      user: userId,
      items: [{ product: productId, quantity }],
    });
  } else {
    const item = cart.items.find((cartItem) => {
      return String(cartItem.product) === productId;
    });

    if (item) {
      item.quantity += quantity;
    } else {
      cart.items.push({ product: product._id, quantity });
    }

    await cart.save();
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
  const cart = await CartModel.findOne({ user: userId });

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  const item = cart.items.find((cartItem) => {
    return String(cartItem.product) === productId;
  });

  if (!item) {
    throw new ApiError(404, "Cart item not found");
  }

  item.quantity = quantity;
  await cart.save();

  return getCart(userId);
};

export const removeCartItem = async (userId: string, productId: string) => {
  const cart = await CartModel.findOne({ user: userId });

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  cart.set(
    "items",
    cart.items.filter((item) => String(item.product) !== productId)
  );

  await cart.save();

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
  const cart = await CartModel.findOne({ user: userId });

  if (!cart) {
    return getCart(userId);
  }

  cart.set("items", []);

  await cart.save();

  return cart;
};
