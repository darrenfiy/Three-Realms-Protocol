#!/usr/bin/env python3
"""
Line Operations MCP Server
行操作工具——讓 AI 可以剪下、複製、搬移文字區塊，不需要逐字重新生成。

Tools:
  - move_lines: 搬移行區塊到指定位置
  - copy_lines: 複製行區塊到指定位置
  - swap_blocks: 交換兩個行區塊
  - delete_lines: 刪除行區塊
  - read_lines: 讀取指定行範圍（輕量版 Read）
"""

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("line-operations")


def _read_file(file_path: str) -> list[str]:
    with open(file_path, "r", encoding="utf-8") as f:
        return f.readlines()


def _write_file(file_path: str, lines: list[str]) -> None:
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(lines)


def _validate_range(lines: list[str], start: int, end: int, label: str = "") -> str | None:
    prefix = f"{label}: " if label else ""
    if start < 1:
        return f"{prefix}start ({start}) must be >= 1"
    if end < start:
        return f"{prefix}end ({end}) must be >= start ({start})"
    if start > len(lines):
        return f"{prefix}start ({start}) exceeds file length ({len(lines)} lines)"
    if end > len(lines):
        return f"{prefix}end ({end}) exceeds file length ({len(lines)} lines)"
    return None


@mcp.tool()
def move_lines(file_path: str, from_start: int, from_end: int, insert_after: int) -> str:
    """Move a block of lines from one position to another within the same file.

    Args:
        file_path: Absolute path to the file
        from_start: First line to move (1-indexed, inclusive)
        from_end: Last line to move (1-indexed, inclusive)
        insert_after: Insert the block after this line number (0 = beginning of file).
                      This refers to line numbers BEFORE the block is removed.
    """
    lines = _read_file(file_path)

    err = _validate_range(lines, from_start, from_end, "source")
    if err:
        return f"Error: {err}"

    if insert_after < 0 or insert_after > len(lines):
        return f"Error: insert_after ({insert_after}) out of range (0-{len(lines)})"

    if from_start <= insert_after <= from_end:
        return "Error: insert_after is inside the source block — nothing to do"

    # Extract the block
    block = lines[from_start - 1 : from_end]

    # Remove from original position
    remaining = lines[: from_start - 1] + lines[from_end:]

    # Adjust insert position after removal
    if insert_after < from_start:
        adj_insert = insert_after
    else:
        adj_insert = insert_after - len(block)

    # Insert at new position
    result = remaining[:adj_insert] + block + remaining[adj_insert:]
    _write_file(file_path, result)

    block_size = from_end - from_start + 1
    return f"Moved {block_size} lines ({from_start}-{from_end}) to after line {insert_after}. File now has {len(result)} lines."


@mcp.tool()
def copy_lines(file_path: str, from_start: int, from_end: int, insert_after: int) -> str:
    """Copy a block of lines and insert the copy at another position.

    Args:
        file_path: Absolute path to the file
        from_start: First line to copy (1-indexed, inclusive)
        from_end: Last line to copy (1-indexed, inclusive)
        insert_after: Insert the copy after this line number (0 = beginning of file)
    """
    lines = _read_file(file_path)

    err = _validate_range(lines, from_start, from_end, "source")
    if err:
        return f"Error: {err}"

    if insert_after < 0 or insert_after > len(lines):
        return f"Error: insert_after ({insert_after}) out of range (0-{len(lines)})"

    block = lines[from_start - 1 : from_end]
    result = lines[:insert_after] + block + lines[insert_after:]
    _write_file(file_path, result)

    block_size = from_end - from_start + 1
    return f"Copied {block_size} lines ({from_start}-{from_end}) to after line {insert_after}. File now has {len(result)} lines."


@mcp.tool()
def swap_blocks(
    file_path: str,
    block1_start: int,
    block1_end: int,
    block2_start: int,
    block2_end: int,
) -> str:
    """Swap two non-overlapping blocks of lines within the same file.
    Block1 must come before Block2 (block1_end < block2_start).

    Args:
        file_path: Absolute path to the file
        block1_start: First line of block 1 (1-indexed, inclusive)
        block1_end: Last line of block 1 (1-indexed, inclusive)
        block2_start: First line of block 2 (1-indexed, inclusive)
        block2_end: Last line of block 2 (1-indexed, inclusive)
    """
    lines = _read_file(file_path)

    err1 = _validate_range(lines, block1_start, block1_end, "block1")
    if err1:
        return f"Error: {err1}"
    err2 = _validate_range(lines, block2_start, block2_end, "block2")
    if err2:
        return f"Error: {err2}"

    if block1_end >= block2_start:
        return f"Error: blocks overlap or are not in order (block1_end={block1_end} >= block2_start={block2_start}). Block1 must come before Block2."

    b1 = lines[block1_start - 1 : block1_end]
    b2 = lines[block2_start - 1 : block2_end]

    result = (
        lines[: block1_start - 1]
        + b2
        + lines[block1_end : block2_start - 1]
        + b1
        + lines[block2_end:]
    )
    _write_file(file_path, result)

    return f"Swapped block1 ({block1_start}-{block1_end}, {len(b1)} lines) with block2 ({block2_start}-{block2_end}, {len(b2)} lines). File now has {len(result)} lines."


@mcp.tool()
def delete_lines(file_path: str, from_start: int, from_end: int) -> str:
    """Delete a block of lines from a file.

    Args:
        file_path: Absolute path to the file
        from_start: First line to delete (1-indexed, inclusive)
        from_end: Last line to delete (1-indexed, inclusive)
    """
    lines = _read_file(file_path)

    err = _validate_range(lines, from_start, from_end)
    if err:
        return f"Error: {err}"

    block_size = from_end - from_start + 1
    result = lines[: from_start - 1] + lines[from_end:]
    _write_file(file_path, result)

    return f"Deleted {block_size} lines ({from_start}-{from_end}). File now has {len(result)} lines."


@mcp.tool()
def read_lines(file_path: str, from_start: int, from_end: int) -> str:
    """Read a specific range of lines from a file. Useful for previewing before move/swap.

    Args:
        file_path: Absolute path to the file
        from_start: First line to read (1-indexed, inclusive)
        from_end: Last line to read (1-indexed, inclusive)
    """
    lines = _read_file(file_path)

    err = _validate_range(lines, from_start, from_end)
    if err:
        return f"Error: {err}"

    block = lines[from_start - 1 : from_end]
    numbered = [f"{from_start + i}\t{line.rstrip()}" for i, line in enumerate(block)]
    header = f"Lines {from_start}-{from_end} of {file_path} ({len(lines)} total lines):\n"
    return header + "\n".join(numbered)


if __name__ == "__main__":
    mcp.run(transport="stdio")
