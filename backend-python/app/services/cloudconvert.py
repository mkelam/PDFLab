"""CloudConvert API service for PDF conversion and manipulation."""
from pathlib import Path
from typing import Optional, List, Dict, Any
import httpx
import aiofiles
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


class ConversionOptions:
    """Options for PDF conversion."""

    def __init__(
        self,
        input_format: str = "pdf",
        output_format: str = "pptx",
        input_file_path: str = "",
        output_file_path: str = "",
        webhook_url: Optional[str] = None,
        dpi: Optional[int] = None,
        pages: Optional[str] = None,
        ocr: bool = True
    ):
        self.input_format = input_format
        self.output_format = output_format
        self.input_file_path = input_file_path
        self.output_file_path = output_file_path
        self.webhook_url = webhook_url
        self.dpi = dpi
        self.pages = pages
        self.ocr = ocr


class CloudConvertService:
    """Service for interacting with CloudConvert API."""

    def __init__(self):
        self.api_key = settings.CLOUDCONVERT_API_KEY
        self.sandbox = settings.CLOUDCONVERT_SANDBOX
        self.base_url = "https://api.cloudconvert.com/v2"
        self.timeout = 300.0  # 5 minutes

    async def convert_file(
        self,
        options: ConversionOptions
    ) -> Dict[str, Any]:
        """
        Convert PDF to specified format using CloudConvert API.

        Args:
            options: Conversion options including input/output paths and format

        Returns:
            Dictionary with success status, output path, job ID, or error

        Example:
            >>> service = CloudConvertService()
            >>> options = ConversionOptions(
            ...     input_file_path="input.pdf",
            ...     output_file_path="output.pptx",
            ...     output_format="pptx"
            ... )
            >>> result = await service.convert_file(options)
            >>> print(result)
            {'success': True, 'output_path': 'output.pptx', 'job_id': '...'}
        """
        try:
            # Validate input file exists
            input_path = Path(options.input_file_path)
            if not input_path.exists():
                raise FileNotFoundError(f"Input file not found: {options.input_file_path}")

            # Ensure output directory exists
            output_path = Path(options.output_file_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Build task configuration
            task_config = self._build_task_config(options)

            # Create CloudConvert job
            job_data = {
                "tasks": {
                    "upload-file": {
                        "operation": "import/upload"
                    },
                    "convert-file": task_config,
                    "export-file": {
                        "operation": "export/url",
                        "input": "convert-file"
                    }
                }
            }

            if options.webhook_url:
                job_data["webhook_url"] = options.webhook_url

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Create job
                job = await self._create_job(client, job_data)
                job_id = job["id"]

                logger.info("cloudconvert_job_created", job_id=job_id)

                # Upload file
                upload_task = next(
                    (task for task in job["tasks"] if task["name"] == "upload-file"),
                    None
                )
                if not upload_task:
                    raise ValueError("Upload task not found in job")

                await self._upload_file(client, upload_task, input_path)

                logger.info("file_uploaded_to_cloudconvert", file=str(input_path))

                # Wait for job completion
                job = await self._wait_for_job(client, job_id)

                logger.info("cloudconvert_job_completed", job_id=job_id)

                # Download converted file
                export_task = next(
                    (task for task in job["tasks"] if task["name"] == "export-file"),
                    None
                )
                if not export_task or not export_task.get("result", {}).get("files"):
                    raise ValueError("Export task or result not found")

                file_url = export_task["result"]["files"][0]["url"]
                await self._download_file(client, file_url, output_path)

                logger.info("converted_file_downloaded", output_path=str(output_path))

                return {
                    "success": True,
                    "output_path": str(output_path),
                    "job_id": job_id
                }

        except Exception as e:
            logger.error("cloudconvert_conversion_error", error=str(e), exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def merge_pdfs(
        self,
        input_files: List[str],
        output_path: str
    ) -> Dict[str, Any]:
        """
        Merge multiple PDFs into one.

        Args:
            input_files: List of paths to PDF files to merge
            output_path: Path where merged PDF should be saved

        Returns:
            Dictionary with success status, output path, job ID, or error
        """
        try:
            # Validate input files
            for file_path in input_files:
                if not Path(file_path).exists():
                    raise FileNotFoundError(f"Input file not found: {file_path}")

            # Ensure output directory exists
            output_path_obj = Path(output_path)
            output_path_obj.parent.mkdir(parents=True, exist_ok=True)

            # Create upload tasks
            upload_tasks = {}
            merge_inputs = []

            for i, _ in enumerate(input_files):
                task_name = f"upload-{i}"
                upload_tasks[task_name] = {
                    "operation": "import/upload"
                }
                merge_inputs.append(task_name)

            # Create CloudConvert job
            job_data = {
                "tasks": {
                    **upload_tasks,
                    "merge-pdfs": {
                        "operation": "merge",
                        "input": merge_inputs,
                        "output_format": "pdf"
                    },
                    "export-file": {
                        "operation": "export/url",
                        "input": "merge-pdfs"
                    }
                }
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Create job
                job = await self._create_job(client, job_data)
                job_id = job["id"]

                logger.info("cloudconvert_merge_job_created", job_id=job_id, file_count=len(input_files))

                # Upload all files
                for i, input_file in enumerate(input_files):
                    upload_task = next(
                        (task for task in job["tasks"] if task["name"] == f"upload-{i}"),
                        None
                    )
                    if not upload_task:
                        raise ValueError(f"Upload task {i} not found")

                    await self._upload_file(client, upload_task, Path(input_file))
                    logger.info("file_uploaded", index=i+1, total=len(input_files))

                # Wait for job completion
                job = await self._wait_for_job(client, job_id)

                logger.info("cloudconvert_merge_job_completed", job_id=job_id)

                # Download merged file
                export_task = next(
                    (task for task in job["tasks"] if task["name"] == "export-file"),
                    None
                )
                if not export_task or not export_task.get("result", {}).get("files"):
                    raise ValueError("Export task or result not found")

                file_url = export_task["result"]["files"][0]["url"]
                await self._download_file(client, file_url, output_path_obj)

                logger.info("merged_pdf_downloaded", output_path=output_path)

                return {
                    "success": True,
                    "output_path": output_path,
                    "job_id": job_id
                }

        except Exception as e:
            logger.error("cloudconvert_merge_error", error=str(e), exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def get_account_info(self) -> Dict[str, Any]:
        """
        Get CloudConvert account information.

        Returns:
            Dictionary with success status, credits, email, or error
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/users/me",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                response.raise_for_status()
                user_data = response.json()["data"]

                return {
                    "success": True,
                    "credits": user_data.get("credits"),
                    "email": user_data.get("email")
                }

        except Exception as e:
            logger.error("cloudconvert_account_info_error", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    async def cancel_job(self, job_id: str) -> Dict[str, Any]:
        """
        Cancel a CloudConvert job.

        Args:
            job_id: CloudConvert job ID to cancel

        Returns:
            Dictionary with success status or error
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/jobs/{job_id}/cancel",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                response.raise_for_status()

                return {"success": True}

        except Exception as e:
            logger.error("cloudconvert_cancel_job_error", job_id=job_id, error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    # ========================================================================
    # PRIVATE HELPER METHODS
    # ========================================================================

    def _build_task_config(self, options: ConversionOptions) -> Dict[str, Any]:
        """Build task configuration based on output format."""
        task_config = {
            "operation": "convert",
            "input": "upload-file",
            "input_format": options.input_format,
            "output_format": options.output_format
        }

        # Format-specific options
        if options.output_format == "pptx":
            task_config["pages"] = options.pages or "all"
            task_config["layout_preserving"] = True
            task_config["ocr"] = options.ocr

        elif options.output_format == "docx":
            task_config["ocr"] = options.ocr
            task_config["pages"] = options.pages or "all"

        elif options.output_format == "xlsx":
            task_config["ocr"] = options.ocr
            task_config["auto_detect_tables"] = True

        elif options.output_format in ("png", "jpg"):
            task_config["pages"] = options.pages or "all"
            task_config["density"] = options.dpi or 300

        return task_config

    async def _create_job(
        self,
        client: httpx.AsyncClient,
        job_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a CloudConvert job."""
        response = await client.post(
            f"{self.base_url}/jobs",
            json=job_data,
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        response.raise_for_status()
        return response.json()["data"]

    async def _upload_file(
        self,
        client: httpx.AsyncClient,
        upload_task: Dict[str, Any],
        file_path: Path
    ) -> None:
        """Upload file to CloudConvert."""
        upload_url = upload_task["result"]["form"]["url"]
        upload_params = upload_task["result"]["form"]["parameters"]

        async with aiofiles.open(file_path, 'rb') as f:
            file_content = await f.read()

        response = await client.post(
            upload_url,
            data=upload_params,
            files={"file": (file_path.name, file_content)}
        )
        response.raise_for_status()

    async def _wait_for_job(
        self,
        client: httpx.AsyncClient,
        job_id: str,
        poll_interval: int = 2
    ) -> Dict[str, Any]:
        """Wait for CloudConvert job to complete."""
        import asyncio

        while True:
            response = await client.get(
                f"{self.base_url}/jobs/{job_id}",
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            job_data = response.json()["data"]

            status = job_data["status"]

            if status == "finished":
                return job_data
            elif status == "error":
                error_msg = job_data.get("message", "Unknown error")
                raise ValueError(f"CloudConvert job failed: {error_msg}")

            # Poll every N seconds
            await asyncio.sleep(poll_interval)

    async def _download_file(
        self,
        client: httpx.AsyncClient,
        file_url: str,
        output_path: Path
    ) -> None:
        """Download file from CloudConvert."""
        response = await client.get(file_url)
        response.raise_for_status()

        async with aiofiles.open(output_path, 'wb') as f:
            await f.write(response.content)


# Singleton instance
cloudconvert_service = CloudConvertService()
