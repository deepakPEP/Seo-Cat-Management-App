import pymongo
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from bson import ObjectId
from collections import defaultdict

# MongoDB connection
client = pymongo.MongoClient("mongodb+srv://techadmin:")
db = client["metaData"]

# Collections
categories_col = db["categories"]
subcategories_col = db["subcategories"]
productcategories_col = db["productcategories"]
liveproducts_col = db["liveproducts"]

def get_product_count(product_category_id):
    """Get count of live products for a product category"""
    try:
        count = liveproducts_col.count_documents({
            "productCategory._id": ObjectId(product_category_id)
        })
        return count
    except Exception as e:
        print(f"Error counting products for {product_category_id}: {e}")
        return 0

def get_sample_products(product_category_id):
    """Get sample product names for a product category"""
    try:
        products = liveproducts_col.find(
            {"productCategory._id": ObjectId(product_category_id)},
            {"productName": 1, "_id": 1}
        )
        return [p.get("productName", "Unnamed Product") for p in products]
    except Exception as e:
        print(f"Error fetching products for {product_category_id}: {e}")
        return []

def fetch_hierarchy():
    """Fetch the complete hierarchy from MongoDB"""
    print("Fetching data from MongoDB...")
    
    # Fetch all categories
    categories = list(categories_col.find({}))
    print(f"Found {len(categories)} categories")
    
    # Fetch all subcategories
    subcategories = list(subcategories_col.find({}))
    print(f"Found {len(subcategories)} subcategories")
    
    # Fetch all product categories
    product_categories = list(productcategories_col.find({}))
    print(f"Found {len(product_categories)} product categories")
    
    # Create lookup dictionaries
    subcat_by_id = {str(sc["_id"]): sc for sc in subcategories}
    prodcat_by_id = {str(pc["_id"]): pc for pc in product_categories}
    
    # Build hierarchy structure
    hierarchy = []
    
    for category in categories:
        cat_data = {
            "category_id": str(category["_id"]),
            "category_name": category.get("name", "Unnamed Category"),
            "subcategories": []
        }
        
        # Get subcategories for this category
        mapped_children = category.get("mappedChildren", [])
        
        for subcat_id in mapped_children:
            subcat_id_str = str(subcat_id)
            if subcat_id_str in subcat_by_id:
                subcat = subcat_by_id[subcat_id_str]
                subcat_data = {
                    "subcategory_id": subcat_id_str,
                    "subcategory_name": subcat.get("name", "Unnamed Subcategory"),
                    "product_categories": []
                }
                
                # Get product categories for this subcategory
                subcat_mapped_children = subcat.get("mappedChildren", [])
                
                for prodcat_id in subcat_mapped_children:
                    prodcat_id_str = str(prodcat_id)
                    if prodcat_id_str in prodcat_by_id:
                        prodcat = prodcat_by_id[prodcat_id_str]
                        
                        # Get product count and sample products
                        product_count = get_product_count(prodcat_id_str)
                        sample_products = get_sample_products(prodcat_id_str) if product_count > 0 else []
                        
                        prodcat_data = {
                            "product_category_id": prodcat_id_str,
                            "product_category_name": prodcat.get("name", "Unnamed Product Category"),
                            "product_count": product_count,
                            "sample_products": sample_products
                        }
                        
                        subcat_data["product_categories"].append(prodcat_data)
                
                cat_data["subcategories"].append(subcat_data)
        
        hierarchy.append(cat_data)
    
    return hierarchy

def create_excel(hierarchy, output_file="pepagora_hierarchy.xlsx"):
    """Create Excel file from hierarchy data"""
    print("Creating Excel file...")
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Product Hierarchy"
    
    # Define styles
    header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=12)
    
    category_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    category_font = Font(bold=True, size=11)
    
    subcategory_fill = PatternFill(start_color="E7E6E6", end_color="E7E6E6", fill_type="solid")
    subcategory_font = Font(bold=True, size=10)
    
    # Headers
    headers = ["Category", "Subcategory", "Product Category", "Product Count", "Sample Products"]
    ws.append(headers)
    
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
    
    # Set column widths
    ws.column_dimensions['A'].width = 30
    ws.column_dimensions['B'].width = 30
    ws.column_dimensions['C'].width = 35
    ws.column_dimensions['D'].width = 15
    ws.column_dimensions['E'].width = 60
    
    # Populate data
    row_num = 2
    
    for category in hierarchy:
        category_name = category["category_name"]
        
        if not category["subcategories"]:
            # Category with no subcategories
            ws.append([category_name, "", "", "", ""])
            cell = ws.cell(row=row_num, column=1)
            cell.font = category_font
            cell.fill = category_fill
            row_num += 1
        else:
            for subcat in category["subcategories"]:
                subcategory_name = subcat["subcategory_name"]
                
                if not subcat["product_categories"]:
                    # Subcategory with no product categories
                    ws.append([category_name, subcategory_name, "", "", ""])
                    ws.cell(row=row_num, column=1).font = category_font
                    ws.cell(row=row_num, column=1).fill = category_fill
                    ws.cell(row=row_num, column=2).font = subcategory_font
                    ws.cell(row=row_num, column=2).fill = subcategory_fill
                    row_num += 1
                else:
                    for prodcat in subcat["product_categories"]:
                        product_category_name = prodcat["product_category_name"]
                        product_count = prodcat["product_count"]
                        sample_products = ", ".join(prodcat["sample_products"]) if prodcat["sample_products"] else ""
                        
                        ws.append([
                            category_name,
                            subcategory_name,
                            product_category_name,
                            product_count if product_count > 0 else "",
                            sample_products
                        ])
                        
                        ws.cell(row=row_num, column=1).font = category_font
                        ws.cell(row=row_num, column=1).fill = category_fill
                        ws.cell(row=row_num, column=2).font = subcategory_font
                        ws.cell(row=row_num, column=2).fill = subcategory_fill
                        
                        row_num += 1
    
    # Save workbook
    wb.save(output_file)
    print(f"Excel file created successfully: {output_file}")

def main():
    try:
        # Fetch hierarchy from MongoDB
        hierarchy = fetch_hierarchy()
        
        # Create Excel file
        create_excel(hierarchy)
        
        print("Process completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    main()