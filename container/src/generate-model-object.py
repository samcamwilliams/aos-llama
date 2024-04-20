def file_to_c_array(output_file_path, file_path, array_name):
    # Read binary data
    with open(file_path, 'rb') as file:
        binary_data = file.read()

    # Convert to a C array
    c_array = f"unsigned char {array_name}[] = {{"
    c_array += ', '.join(f"0x{byte:02x}" for byte in binary_data)
    c_array += "};\n"
    c_array += f"unsigned int {array_name}_size = sizeof({array_name});"

    # Output to a .c file
    with open(output_file_path, 'w') as output_file:
        output_file.write(c_array)

    return output_file_path

# Usage
c_file_path = file_to_c_array('model.c', 'model.bin', 'preload_model')
print(f"C source file generated: {c_file_path}")
c_file_path = file_to_c_array('tokenizer.c', 'tokenizer.bin', 'preload_tokenizer')
print(f"C source file generated: {c_file_path}")