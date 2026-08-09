import { uploadProductImage } from "../../integrations/s3.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { isValidObjectId } from "../../utils/isValidObjectId.js";
import { createActivityLog } from "../logs/log.service.js";
import { ProductModel } from "./product.model.js";

export const getProducts = async () => {
  return ProductModel.find({ isActive: true }).sort({ createdAt: -1 });
};

export const getAdminProducts = async () => {
  return ProductModel.find().sort({ createdAt: -1 });
};

export const getProductById = async (id: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid product id");
  }

  const product = await ProductModel.findById(id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

export const createProduct = async (
  data: Record<string, unknown>,
  files: Express.Multer.File[] = [],
  adminId: string
) => {
  const existingProduct = await ProductModel.findOne({ sku: data.sku });

  if (existingProduct) {
    throw new ApiError(409, "SKU already exists");
  }

  const images = await uploadImages(files);
  const product = await ProductModel.create({ ...data, images });

  await createActivityLog({
    user: adminId,
    action: "PRODUCT_CREATED",
    entityType: "Product",
    entityId: product.id,
    message: `Product created: ${product.name}`,
  });

  return product;
};

export const updateProduct = async (
  id: string,
  data: Record<string, unknown>,
  files: Express.Multer.File[] = [],
  adminId: string
) => {
  const product = await getProductById(id);
  const images = await uploadImages(files);

  Object.assign(product, data);

  if (images.length > 0) {
    product.images.push(...images);
  }

  await product.save();

  await createActivityLog({
    user: adminId,
    action: "PRODUCT_UPDATED",
    entityType: "Product",
    entityId: product.id,
    message: `Product updated: ${product.name}`,
  });

  return product;
};

export const deleteProduct = async (id: string, adminId: string) => {
  const product = await getProductById(id);

  product.isActive = false;
  await product.save();

  await createActivityLog({
    user: adminId,
    action: "PRODUCT_DELETED",
    entityType: "Product",
    entityId: product.id,
    message: `Product deleted: ${product.name}`,
  });

  return product;
};

const uploadImages = async (files: Express.Multer.File[]) => {
  const images: string[] = [];

  for (const file of files) {
    const imageUrl = await uploadProductImage(file);
    images.push(imageUrl);
  }

  return images;
};
