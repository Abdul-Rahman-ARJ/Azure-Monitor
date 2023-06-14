const sql = require("mssql");

module.exports = async function (context, req) {
    // var { server, db, date } = req.body;
    const config = {
      server: "elastic-sqlserver002.database.windows.net",
      database: "eton_rei_data_QaProd",
      user: "atrainuser",
      password: "rt53#$%@fgt5$3",
      options: {
        encrypt: true, // if using Azure
      },
    };

    async function getPositionDW() {
      try {
        try {
          await sql.connect(config);
        } catch (error) {
          res.status(200).json({ message: error });
        }
        const result = await sql.query(
          `DECLARE  @acd_str VARCHAR(max)=NULL;
DECLARE @invalid_mv DECIMAL(13,2) = 99999999999.99
DECLARE @recondateCALC DATE ='06/12/2023'; 
DECLARE @asofdatekey_int INT = CAST(FORMAT(@recondateCALC, 'yyyyMMdd') AS INT);
DECLARE @callid UNIQUEIDENTIFIER = NEWID();
Declare @call VARCHAR(40)= CAST(@callid AS NVARCHAR(40))
    DELETE [dw].[Position_Recon_RDB_DW]
    WHERE asofdatekey = @asofdatekey_int;
IF @acd_str  IS NULL
BEGIN
DROP TABLE IF EXISTS #Accounts;
    CREATE TABLE #Accounts
    (
        acd_row_id INT
    );
    INSERT INTO #Accounts
    (
        acd_row_id
    )
    SELECT acd.acd_row_id
    FROM crm.acd_acct_data acd
    WHERE acd.rst_row_id <> 6;
    SELECT @acd_str=  STUFF((SELECT ',' + CAST(acd_row_id AS VARCHAR) 
                    FROM #Accounts x
                    FOR XML PATH('')),1,1,'')  
END
        EXEC rpt.usp_trans_rollup_balance @acd = @acd_str,
                                                            @dt = @recondateCALC,
                                                            @dataset = 0,
                                                            @Accruals = 1,
                                                            @iter = 1,
                                                            @is_debug = 0,
                                                            @call = @call,
                                                            @vis_usr = -9999,
                                                            @calling_proc = NULL;
  SELECT ISNULL(CAST(FORMAT(rub.Date, 'yyyyMMdd') AS INT), dp.AsOfDateKey) AS AsofDatekey,
           ISNULL(rub.Custodian, act.CustodianName) AS Custodian_Name,
           rdt.RelationshipBK,
           ISNULL(rub.Relationship, rdt.RelationshipName) AS Relationship_name,
           ISNULL(rub.edt_row_id, edt.EntityBK) AS EntityBK,
           ISNULL(rub.Entity, edt.EntityName) AS EntityName,
           ISNULL(rub.efcm_row_id, edt.CurrencyBK) AS Entity_CurrencyBK,
           ISNULL(rub.[Entity Currency Symbol], edt.Currency) AS Entity_Currency,
           ISNULL(rub.acd_row_id, act.AccountBK) AS AccountBK,
           ISNULL(rub.[Account Number], act.AccountNumber) AS Account_Number,
           ISNULL(rub.[Account Name], act.AccountName) AS Account_Name,
           ISNULL(rub.ism_row_id, ast.AssetBK) AS AssetBK,
           ISNULL(rub.Cusip, ast.Cusip) AS Cusip,
           ISNULL(rub.[Cusip Description], ast.[Cusip Description]) AS Cusip_Description,
           ISNULL(ivm.ivm_inv_val_mthd_desc, ast.InvestmentValuationMethod) AS ValuationMethod_Name,
           rub.prc_mult AS RDB_Price_Multiplier,
           ast.PriceMultiplier AS DW_Price_Multiplier,
           ISNULL(rub.Units, 0) AS RDB_Units,
           ISNULL(dp.Quantity, 0) AS DW_Units,
           ISNULL(rub.[Tax Cost], 0) AS [RDB_Base_TaxCost],
           ISNULL(dp.Tax_Cost, 0) AS [DW_Base_TaxCost],
           ISNULL(CASE WHEN LEN(rub.[Market Value]) > 14 THEN @invalid_mv ELSE rub.[Market Value] END , 0) AS [RDB_Base_MV],
           ISNULL(dp.EndMV, 0) AS [DW_Base_MV],
           ISNULL(rub.[Unrealized GL], 0) AS RBD_Base_URGL,
           ISNULL(dp.EndMV,0) - ISNULL(dp.Tax_Cost, 0) AS DW_Base_URGL,
           ISNULL(rub.[Accrued Interest], 0) AS RDB_Base_AI,
           ISNULL(dp.EndAccrual, 0) AS DW_Base_AI,           
           GETDATE(),
           ISNULL([rub].[prc_price],0) AS RDB_Price,
           ISNULL([dp].[Price],0) AS DW_Price,
           [dp].[HoldingsKey] AS [DailyPerformanceKey],           

           ISNULL(rub.[Local Tax Cost], 0) AS RBD_Local_TaxCost,
           ISNULL(dp.Local_Tax_Cost, 0) AS DW_Local_TaxCost,

           ISNULL(CASE WHEN LEN(rub.[Local Market Value]) > 14 THEN @invalid_mv ELSE rub.[Local Market Value] END , 0) AS RDB_Local_MV,
           ISNULL(dp.Local_EndMV, 0) AS DW_Local_MV,

           ISNULL(rub.[Local Unrealized GL], 0) AS RBD_Local_URGL,
           ISNULL(dp.Local_EndMV,0) - ISNULL(dp.Local_Tax_Cost, 0) AS DW_Local_URGL,

           ISNULL(rub.[Local Accrued Interest], 0) AS RDB_Local_AI,
           ISNULL(dp.Local_EndAccrual, 0) AS DW_Local_AI

    FROM tmp.usp_trans_rollup_balance rub WITH (NOLOCK)
        LEFT JOIN dbo.ism_inv_sec_mstr ism WITH (NOLOCK)
            ON rub.ism_row_id = ism.ism_row_id
            AND ism.rst_row_id <> 6
        LEFT JOIN dbo.ivm_inv_val_mthd ivm WITH (NOLOCK)
            ON ism.ivm_row_id = ivm.ivm_row_id
            AND ivm.rst_row_id <> 6
        FULL JOIN [dw].[Fact_Holdings] dp WITH (NOLOCK)
            ON rub.acd_row_id = dp.AccountBK
               AND rub.ism_row_id = dp.AssetBK
               AND CAST(FORMAT(rub.Date, 'yyyyMMdd') AS INT) = dp.AsOfDateKey
        LEFT JOIN [dw].[Dimension_Account] act WITH (NOLOCK)
            ON dp.AccountBK = act.AccountBK
               AND act.IsCurrent = 'Y'
        LEFT JOIN [dw].[Dimension_Entity] edt WITH (NOLOCK)
            ON act.EntityBK = edt.EntityBK
        LEFT JOIN [dw].[Dimension_Relationship] rdt WITH (NOLOCK)
            ON edt.RelationshipBK = rdt.RelationshipBK
               AND rdt.IsCurrent = 'Y'
        LEFT JOIN [dw].[Dimension_Asset] ast WITH (NOLOCK)
            ON dp.AssetBK = ast.AssetBK
               AND ast.IsCurrent = 'Y'
    WHERE InstID = @call`
        );
        sql.close();
        return result.recordset;
      } catch (err) {
        try {
          sql.close();
        } catch (error) {
          context.error(err);
          // res.status(200).json({ "message": err })
        }
        context.error(err);
        // res.status(200).json({ "message": err })
      }
    }

    try {
      const data = await getPositionDW();
      context.log(data);
      context.res = {
        status: 200 /* Defaults to 200 */,
        body: { data: data },
      };
    //   context.done();
      // res.status(200).json({ "data": data })
    } catch (error) {
      context.res = {
        status: 200 /* Defaults to 200 */,
        body: { message: error },
      };
      context.done();
      // res.status(200).json({ "message": error })
    }
  } 
