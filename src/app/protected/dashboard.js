"use client";
import Image from "next/image";
import Areac from "./areachart";
import Piec from "./piechart";
import { memo, useState, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import Cookies from "universal-cookie";
const Dashboard = memo(function Dashboard(props) {
 
 const deferredQuery = useDeferredValue(props.user[0]);
 
  // console.log(props.transtables);
  const router = useRouter();

  const handleClearCookies = () => {
    const cookies = new Cookies();

    // Get all cookies
    const allCookies = cookies.getAll();

    // Clear all cookies
    for (const cookie in allCookies) {
      cookies.remove(cookie, { path: "/" });
    }

    // Redirect to the new page
    router.push("/"); // replace '/new-page' with your target path
  };
  console.log("inside dashboard");

  return (
    <div className="data">
      <div className="dashdata">
        <h1 className="headname marg">Dashboard</h1>
        <p className="subhead">Analysis</p>
        <div className="graph maingraph">
          <div className="graphs areachart">
            <Areac transtables={props.transtables} />
          </div>
          <div className="graphs piechart">
            <Piec catamount={props.catamount} />
          </div>
        </div>
        <div className="place">
          <p className="subhead">Account Overview</p>
          <div className="graph equalspace">
            <div className="info light">
              <p>Credit</p>
              <p className="amount green">
                <span>₹</span>
                {props.creditdebit
                  .filter((item) => item["type"] === "Credit")
                  .reduce((total, item) => total + item["amount"], 0)}
              </p>
            </div>
            <div className="info light">
              <p>Debit</p>
              <p className="amount red">
                <span>₹</span>
                {props.creditdebit
                  .filter((item) => item["type"] === "Debit")
                  .reduce((total, item) => total + item["amount"], 0)}
              </p>
            </div>
            <div className="info light">
              <p>Saving</p>
              <p className="amount yellow">
                <span>₹</span>
                {props.creditdebit.reduce((total, item) => {
                  if (item["type"] === "Credit") return total + item["amount"];
                  if (item["type"] === "Debit") return total - item["amount"];
                  return total;
                }, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="profile">
        <h1 className="headname">Profile</h1>
        <div className="profiledata">
          <Image
            alt="image"
            // src={deferredQuery?deferredQuery.image:"/profile.png"}
            src={`http://127.0.0.1:3000/api/get-uploaded-file?file=${encodeURIComponent(deferredQuery?deferredQuery.image:"/profile.png")}`}
            height={100}
            width={100}
            className="profimg"
          />
          <p>{props.user[0] ? props.user[0]["name"] : " "}</p>
          <div className="edit">
            <button className="profeditbutton" onClick={()=>props.setActiveComponent("component4")}>
              <Image alt="image" src="/edit.png" width={25} height={25} />
            </button>
            {/* <button className="profeditbutton">
              <Image alt="image" src="/notification.png" width={25} height={25} />
            </button> */}
            <button className="profeditbutton" onClick={handleClearCookies}>
              <Image alt="image" src="/logout.png" width={20} height={20} />
            </button>
          </div>
        </div>
        <div className="profsubhead">
          <p className="headname margin">Transfers</p>
          <p className="seemore" onClick={()=>{ props.setActiveComponent('component2')}}>see more</p>
        </div>
        <div className="tabledb light">
          <table>
            <tbody>
              {props.trans.slice(0, 5).map((item, index) => (
                <tr key={index}>
                  <td>{item.type}</td>
                  <td>{item.date}</td>
                  <td>
                    <span>₹</span>
                    {item.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="catname">
          <div className="profsubhead">
            <p className="headname margin">Categories</p>
            <p className="seemore" onClick={()=>{ props.setActiveComponent('component3')}}>see more</p>
          </div>
          <div className="categ light">
            {props.cate.slice(0, 3).map((item, index) => (
              <div className="categbox" key={index}>
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
