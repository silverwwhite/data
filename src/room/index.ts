import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "@hono/zod-validator";
import db from "../db/index.js";

const roomRoutes = new Hono();

/* -----------------------------
   Zod Schema
----------------------------- */
const createRoomSchema = z.object({
  RoomNumber: z.string("กรุณากรอกเลขห้อง")
    .min(1, "เลขห้องห้ามว่าง"),
  Type: z.string("กรุณากรอกประเภทห้อง"),
  Price: z.number({ invalid_type_error: "ราคาต้องเป็นตัวเลข" })
    .positive("ราคาต้องมากกว่า 0"),
  Status: z.string("กรุณากรอกสถานะห้อง"),
});

/* -----------------------------
   Type
----------------------------- */
type Room = {
  RoomID: number;
  RoomNumber: string;
  Type: string;
  Price: number;
  Status: string;
};

/* -----------------------------
   GET Room by ID
----------------------------- */
// ✅ GET ALL ROOMS
roomRoutes.get("/", (c) => {
  const sql = "SELECT * FROM Room";
  const stmt = db.prepare<[], Room>(sql);
  const rooms = stmt.all();

  return c.json({
    data: rooms,
  });
});

// ✅ GET ROOM BY ID
roomRoutes.get("/:id", (c) => {
  const { id } = c.req.param();

  const sql = "SELECT * FROM Room WHERE RoomID = @id";
  const stmt = db.prepare<{ id: string }, Room>(sql);
  const room = stmt.get({ id });

  if (!room) {
    return c.json(
      { message: "Room not found" },
      404
    );
  }

  return c.json({
    message: `Room for ID: ${id}`,
    data: room,
  });
});


/* -----------------------------
   POST Create Room
----------------------------- */
roomRoutes.post(
  "/",
  zValidator("json", createRoomSchema, (result, c) => {
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
    const body = await c.req.json<Omit<Room, "RoomID">>();

    const sql = `
      INSERT INTO Room
      (RoomNumber, Type, Price, Status)
      VALUES (@RoomNumber, @Type, @Price, @Status);
    `;

    const stmt = db.prepare<Omit<Room, "RoomID">>(sql);
    const result = stmt.run(body);

    if (result.changes === 0) {
      return c.json({ message: "Failed to create room" }, 500);
    }

    const lastRowid = result.lastInsertRowid as number;

    const sql2 = "SELECT * FROM Room WHERE RoomID = ?";
    const stmt2 = db.prepare<[number], Room>(sql2);
    const newRoom = stmt2.get(lastRowid);

    return c.json(
      {
        message: "Room created",
        data: newRoom,
      },
      201
    );
  }
);

/* -----------------------------
   PUT Update Room
----------------------------- */
roomRoutes.put(
  "/:id",
  zValidator("json", createRoomSchema),

  async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json<Omit<Room, "RoomID">>();

    const sql = `
      UPDATE Room
      SET
        RoomNumber = @RoomNumber,
        Type = @Type,
        Price = @Price,
        Status = @Status
      WHERE RoomID = @id
    `;

    const stmt = db.prepare(sql);
    const result = stmt.run({ ...body, id });

    if (result.changes === 0) {
      return c.json({ message: "Room not found" }, 404);
    }

    return c.json({ message: "Room updated" });
  }
);

/* -----------------------------
   DELETE Room
----------------------------- */
roomRoutes.delete("/:id", (c) => {
  const { id } = c.req.param();

  const sql = "DELETE FROM Room WHERE RoomID = ?";
  const stmt = db.prepare(sql);
  const result = stmt.run(id);

  if (result.changes === 0) {
    return c.json({ message: "Room not found" }, 404);
  }

  return c.json({ message: "Room deleted" });
});

export default roomRoutes;
