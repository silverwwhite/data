import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "@hono/zod-validator";
import db from "../db/index.js";

const hotelRoutes = new Hono();

/* ---------------- Schema ---------------- */
const createHotelSchema = z.object({
  name: z.string().min(3, "ชื่อโรงแรมต้องยาวอย่างน้อย 3 ตัว"),
  location: z.string().min(3, "กรุณากรอกสถานที่"),
  rating: z.number().min(0).max(5),
  contact: z.string().min(5, "กรุณากรอกข้อมูลติดต่อ"),
});

/* ---------------- Type ---------------- */
type Hotel = {
  HotelID: number;
  name: string;
  location: string;
  rating: number;
  contact: string;
};

/* ---------------- GET :id ---------------- */
hotelRoutes.get("/:id", (c) => {
  const { id } = c.req.param();

  const sql = "SELECT * FROM Hotel WHERE HotelID = @id";
  const stmt = db.prepare<{ id: string }, Hotel>(sql);
  const hotel = stmt.get({ id });

  if (!hotel) {
    return c.json({ message: "Hotel not found" }, 404);
  }

  return c.json({
    message: `Hotel ID: ${id}`,
    data: hotel,
  });
});

hotelRoutes.get("/", (c) => {
  const sql = "SELECT * FROM Hotel";
  const stmt = db.prepare<[], Hotel[]>(sql);
  const hotels = stmt.all();
  return c.json({
    message: "All hotels",
    data: hotels,
  });
});

/* ---------------- Schema Update/Delete ---------------- */
const updateHotelSchema = z.object({
  name: z.string().min(3, "ชื่อโรงแรมต้องยาวอย่างน้อย 3 ตัว").optional(),
  location: z.string().min(3, "กรุณากรอกสถานที่").optional(),
  rating: z.number().min(0).max(5).optional(),
  contact: z.string().min(5, "กรุณากรอกข้อมูลติดต่อ").optional(),
});

/* ---------------- POST ---------------- */
hotelRoutes.post(
  "/",
  zValidator("json", createHotelSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          message: "Validation Error",
          errors: result.error.issues,
        },
        400
      );
    }
  }),
  async (c) => {
    const body = await c.req.json<Omit<Hotel, "HotelID">>();

    const sql = `
      INSERT INTO Hotel (name, location, rating, contact)
      VALUES (@name, @location, @rating, @contact)
    `;

    const stmt = db.prepare<Omit<Hotel, "HotelID">>(sql);
    const result = stmt.run(body);

    if (result.changes === 0) {
      return c.json({ message: "Failed to create hotel" }, 500);
    }

    const lastId = result.lastInsertRowid as number;

    const sql2 = "SELECT * FROM Hotel WHERE HotelID = ?";
    const stmt2 = db.prepare<[number], Hotel>(sql2);
    const newHotel = stmt2.get(lastId);

    return c.json(
      {
        message: "Hotel created",
        data: newHotel,
      },
      201
    );
  }
);

/* ---------------- PUT :id ---------------- */
hotelRoutes.put(
  "/:id",
  zValidator("json", updateHotelSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          message: "Validation Error",
          errors: result.error.issues,
        },
        400
      );
    }
  }),
  async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json<Partial<Omit<Hotel, "HotelID">>>();

    const sql = "SELECT * FROM Hotel WHERE HotelID = @id";
    const stmt = db.prepare<{ id: string }, Hotel>(sql);
    const hotel = stmt.get({ id });

    if (!hotel) {
      return c.json({ message: "Hotel not found" }, 404);
    }

    const updateData = {
      name: body.name ?? hotel.name,
      location: body.location ?? hotel.location,
      rating: body.rating ?? hotel.rating,
      contact: body.contact ?? hotel.contact,
    };

    const updateSql = `
      UPDATE Hotel 
      SET name = @name, location = @location, rating = @rating, contact = @contact
      WHERE HotelID = @id
    `;

    const updateStmt = db.prepare<Omit<Hotel, "HotelID"> & { id: string }>(updateSql);
    const result = updateStmt.run({ ...updateData, id });

    if (result.changes === 0) {
      return c.json({ message: "Failed to update hotel" }, 500);
    }

    const sql2 = "SELECT * FROM Hotel WHERE HotelID = @id";
    const stmt2 = db.prepare<{ id: string }, Hotel>(sql2);
    const updatedHotel = stmt2.get({ id });

    return c.json({
      message: "Hotel updated successfully",
      data: updatedHotel,
    });
  }
);

/* ---------------- DELETE :id ---------------- */
hotelRoutes.delete("/:id", (c) => {
  const { id } = c.req.param();

  const sql = "SELECT * FROM Hotel WHERE HotelID = @id";
  const stmt = db.prepare<{ id: string }, Hotel>(sql);
  const hotel = stmt.get({ id });

  if (!hotel) {
    return c.json({ message: "Hotel not found" }, 404);
  }

  const deleteSql = "DELETE FROM Hotel WHERE HotelID = @id";
  const deleteStmt = db.prepare<{ id: string }>(deleteSql);
  const result = deleteStmt.run({ id });

  if (result.changes === 0) {
    return c.json({ message: "Failed to delete hotel" }, 500);
  }

  return c.json({
    message: "Hotel deleted successfully",
    data: hotel,
  });
});

export default hotelRoutes;