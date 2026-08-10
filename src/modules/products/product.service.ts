import { prisma } from "../../config/prisma.js";
import { uploadProductImage } from "../../integrations/s3.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { createActivityLog } from "../logs/log.service.js";

// Add _id alias so frontend code that uses MongoDB-style product._id keeps working
const withId = <T extends { id: string }>(obj: T): T & { _id: string } => ({
  ...obj,
  _id: obj.id,
});

export const getProducts = async () => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return products.map(withId);
};

export const getAdminProducts = async () => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  return products.map(withId);
};

export const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return withId(product);
};

export const createProduct = async (
  data: Record<string, unknown>,
  files: Express.Multer.File[] = [],
  adminId: string
) => {
  const images = await uploadImages(files);

  const product = await prisma.product.create({
    data: {
      name: String(data.name || ""),
      description: String(data.description || ""),
      price: Number(data.price || 0),
      stock: Number(data.stock || 0),
      category: String(data.category || "General"),
      images,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      discountThreshold: Number(data.discountThreshold || 0),
      discountPercent: Number(data.discountPercent || 0),
    },
  });

  await createActivityLog({
    user: adminId,
    action: "PRODUCT_CREATED",
    entityType: "Product",
    entityId: product.id,
    message: `Product created: ${product.name}`,
  });

  return withId(product);
};

export const updateProduct = async (
  id: string,
  data: Record<string, unknown>,
  files: Express.Multer.File[] = [],
  adminId: string
) => {
  const existingProduct = await getProductById(id);
  const newImages = await uploadImages(files);

  const updatedImages =
    newImages.length > 0
      ? [...existingProduct.images, ...newImages]
      : existingProduct.images;

  const updatePayload: Record<string, unknown> = {};
  if (data.name !== undefined) updatePayload.name = String(data.name);
  if (data.description !== undefined)
    updatePayload.description = String(data.description);
  if (data.price !== undefined) updatePayload.price = Number(data.price);
  if (data.stock !== undefined) updatePayload.stock = Number(data.stock);
  if (data.category !== undefined) updatePayload.category = String(data.category);
  if (data.isActive !== undefined) updatePayload.isActive = Boolean(data.isActive);
  if (data.discountThreshold !== undefined) updatePayload.discountThreshold = Number(data.discountThreshold);
  if (data.discountPercent !== undefined) updatePayload.discountPercent = Number(data.discountPercent);
  updatePayload.images = updatedImages;

  const product = await prisma.product.update({
    where: { id },
    data: updatePayload as any,
  });

  await createActivityLog({
    user: adminId,
    action: "PRODUCT_UPDATED",
    entityType: "Product",
    entityId: product.id,
    message: `Product updated: ${product.name}`,
  });

  return withId(product);
};

export const deleteProduct = async (id: string, adminId: string) => {
  await getProductById(id);

  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  await createActivityLog({
    user: adminId,
    action: "PRODUCT_DELETED",
    entityType: "Product",
    entityId: product.id,
    message: `Product deleted: ${product.name}`,
  });

  return withId(product);
};

const uploadImages = async (files: Express.Multer.File[]) => {
  const images: string[] = [];

  for (const file of files) {
    const imageUrl = await uploadProductImage(file);
    images.push(imageUrl);
  }

  return images;
};
