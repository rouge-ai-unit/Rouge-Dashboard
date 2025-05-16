"use client";
import { useEffect, useState } from "react";
import axios from "axios";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "sonner";
import AppSidebar from "@/components/AppSidebar";
import MobileSidebar from "@/components/MobileSideBar";

type WorkItem = {
  _id?: string;
  unit: string;
  task: string;
  assignedTo: string;
  status: string;
  lastUpdated: string;
  deadline: string;
  workStart: string;
  memberUpdate: string;
};

const units = ["AI", "INFLUENCER", "MANAGEMENT", "BR UNIT"];

export default function WorkTracker() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [data, setData] = useState<WorkItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [form, setForm] = useState<WorkItem>({
    unit: "",
    task: "",
    assignedTo: "",
    status: "To Do",
    lastUpdated: new Date().toISOString(),
    deadline: "",
    workStart: "",
    memberUpdate: "",
  });

  const fetchData = async () => {
    try {
      const res = await axios.get("/api/tracker");
      setData(res.data);
      console.log(res.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDateChange = (date: Date | null, name: string) => {
    setForm({
      ...form,
      [name]: date ? date.toISOString().split("T")[0] : "",
    });
  };

  const handleSubmit = async () => {
    try {
      if (form._id) {
        await axios.put(`/api/tracker/${form._id}`, form);
      } else {
        await axios.post("/api/tracker", form);
      }
      setForm({
        unit: "",
        task: "",
        assignedTo: "",
        status: "To Do",
        lastUpdated: new Date().toISOString(),
        deadline: "",
        workStart: "",
        memberUpdate: "",
      });
      fetchData();
    } catch (error) {
      toast.error(`Failed to submit data:${error}`);
    }
  };

  const handleEdit = (item: WorkItem) => {
    setForm(item);
  };

  const handleDelete = async (id?: string) => {
    try {
      if (id) {
        toast.info("Deleting data... Please wait.");
        await axios.delete(`/api/tracker/${id}`);
        fetchData();
        toast.success("Data deleted successfully.");
      }
    } catch (error) {
      console.error("Failed to delete data:", error);
    }
  };

  const filteredData = data.filter((item) =>
    [
      item.unit,
      item.task,
      item.assignedTo,
      item.status,
      item.deadline,
      item.workStart,
      item.memberUpdate,
      new Date(item.lastUpdated).toLocaleString(),
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const isDeadlineOver = (deadline: string) => {
    return deadline && new Date(deadline) < new Date(new Date().toDateString());
  };

  const handleSeeMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  return (
    <main>
      <div className="hidden md:block">
        {/* On mobile it will not be shown  */}
        <AppSidebar onCollapse={setIsSidebarCollapsed} />
      </div>
      <div className="md:hidden flex">
        <MobileSidebar />
      </div>
      <div
        className={`${
          isSidebarCollapsed ? "md:ml-[5rem]" : "md:ml-[15rem]"
        } transition-all duration-300 mt-4 mb-4 mr-4 min-h-[calc(95vh)] min-w-[calc(95vh) bg-[#191A1A] md:rounded-lg border-[0.1px] border-slate-600 overflow-hidden p-4 text-white text-justify`}
      >
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-white">
          📋 Work Tracker
        </h1>

        <input
          type="text"
          placeholder="Search by unit, task, assignee, status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-6 w-full p-3 rounded-lg bg-[#1f1f1f] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="bg-[#1a1a1a] p-4 sm:p-6 rounded-xl mb-8 sm:mb-10 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <select
              name="unit"
              value={form.unit}
              onChange={handleChange}
              className="p-3 rounded-lg bg-[#2b2b2b] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Unit</option>
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>

            <input
              name="task"
              value={form.task}
              onChange={handleChange}
              placeholder="Task"
              className="p-3 rounded-lg bg-[#2b2b2b] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="assignedTo"
              value={form.assignedTo}
              onChange={handleChange}
              placeholder="Assigned To"
              className="p-3 rounded-lg bg-[#2b2b2b] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="memberUpdate"
              value={form.memberUpdate}
              onChange={handleChange}
              placeholder="Update"
              className="p-3 rounded-lg bg-[#2b2b2b] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <DatePicker
              selected={form.workStart ? new Date(form.workStart) : null}
              onChange={(date) => handleDateChange(date, "workStart")}
              placeholderText="Work Start (Task Begin Date)"
              className="p-3 rounded-lg bg-[#2b2b2b] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              dateFormat="yyyy-MM-dd"
            />
            <DatePicker
              selected={form.deadline ? new Date(form.deadline) : null}
              onChange={(date) => handleDateChange(date, "deadline")}
              placeholderText="Deadline (Task Due Date)"
              className="p-3 rounded-lg bg-[#2b2b2b] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              dateFormat="yyyy-MM-dd"
            />
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="p-3 rounded-lg bg-[#2b2b2b] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>To Do</option>
              <option>In Progress</option>
              <option>Done</option>
            </select>
          </div>
          <button
            onClick={handleSubmit}
            className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white flex items-center gap-2 w-full sm:w-auto justify-center transition-colors duration-200"
          >
            <Plus className="w-5 h-5" /> {form._id ? "Update" : "Add"}
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-700">
          <table className="min-w-full text-sm text-left text-white">
            <thead className="bg-[#1f1f1f] text-gray-300">
              <tr>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Member Update</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, visibleCount).map((item) => (
                <tr
                  key={item._id}
                  className="border-t border-gray-800 hover:bg-[#232323]"
                >
                  <td className="px-4 py-3">{item.task}</td>
                  <td className="px-4 py-3">{item.unit}</td>
                  <td className="px-4 py-3">{item.assignedTo}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === "Done"
                          ? "bg-green-600"
                          : item.status === "In Progress"
                          ? "bg-yellow-600"
                          : "bg-gray-600"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{item.workStart}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        isDeadlineOver(item.deadline)
                          ? "text-red-500 font-semibold"
                          : ""
                      }
                    >
                      {item.deadline}
                    </span>
                  </td>
                  <td className="px-4 py-3">{item.memberUpdate}</td>
                  <td className="px-4 py-3">
                    {new Date(item.lastUpdated).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 flex justify-center gap-3">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-yellow-400 hover:text-yellow-600 cursor-pointer"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredData.slice(0, visibleCount).map((item) => (
            <div
              key={item._id}
              className="bg-[#1f1f1f] p-4 rounded-lg shadow-md border border-gray-700"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{item.task}</h3>
                  <p className="text-sm text-gray-400">Unit: {item.unit}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-yellow-400 hover:text-yellow-600"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <p>
                  <span className="font-semibold">Assigned To:</span>{" "}
                  {item.assignedTo}
                </p>
                <p>
                  <span className="font-semibold">Status:</span>{" "}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      item.status === "Done"
                        ? "bg-green-600"
                        : item.status === "In Progress"
                        ? "bg-yellow-600"
                        : "bg-gray-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Start:</span> {item.workStart}
                </p>
                <p>
                  <span className="font-semibold">Deadline:</span>{" "}
                  <span
                    className={
                      isDeadlineOver(item.deadline)
                        ? "text-red-500 font-semibold"
                        : ""
                    }
                  >
                    {item.deadline}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Update:</span>{" "}
                  {item.memberUpdate}
                </p>
                <p>
                  <span className="font-semibold">Last Updated:</span>{" "}
                  {new Date(item.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {visibleCount < filteredData.length && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleSeeMore}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors duration-200 w-full sm:w-auto"
            >
              See More
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
